from datetime import datetime

from sqlalchemy import and_, func, or_, select, text, not_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, joinedload, Query

from app import task
from app.control.enums import ControlStatus, Frequency, Area
from app.control.model import Control
from app.core.config import settings
from app.task.enums import TaskStatus
from app.task.model import Task
from app.task.schemas import TaskUpdate, TaskWithControlResponse
from app.user.enums import UserRoles
from app.user.model import User


class TaskRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, task_id: int) -> Task | None:
        return await self.db.get(Task, task_id)

    async def get_by_id_with_control(self, task_id: int) -> TaskWithControlResponse | None:
        result = await self.db.execute(
            select(Task)
            .options(
                joinedload(Task.control)
                .load_only(
                    Control.id,
                    Control.name,
                    Control.area,
                    Control.frequency,
                    Control.responsible_id,
                    Control.backup_id,
                    Control.dashboard_url,
                    Control.time_estimate,
                    Control.priority,
                    Control.risk,
                    Control.description,
                )
                .joinedload(Control.responsible)
                .load_only(User.id, User.username, User.first_name, User.last_name, User.is_og),
                joinedload(Task.user).load_only(User.id, User.username, User.first_name, User.last_name),
                )
            .where(Task.id == task_id)
        )
        return result.scalars().one_or_none()

    async def get_all_with_controls(
            self,
            current_user: User,
            status: list[TaskStatus] | None = None,
            frequency: Frequency | None = None,
            area: list[Area] | None = None,
            user_id: int | None = None,
            responsible_id: int | None = None,
            search: str | None = None,
            offset: int = 0,
            limit: int = 20
    ) -> tuple[list[Task], int]:
        base_options = [
            joinedload(Task.control)
            .load_only(
                Control.id,
                Control.name,
                Control.area,
                Control.frequency,
                Control.responsible_id,
                Control.backup_id,
                Control.dashboard_url,
                Control.time_estimate,
                Control.priority,
                Control.risk,
                Control.description,
            )
            .joinedload(Control.responsible)
            .load_only(User.id, User.username, User.first_name, User.last_name, User.is_og),
            joinedload(Task.user).load_only(User.id, User.username, User.first_name, User.last_name),
        ]
        base_order = [Task.created_at.desc(), Task.id.desc()]

        if current_user is None or current_user.role == UserRoles.ADMIN:
            where = [Control.status == ControlStatus.ACTIVE]
            base_stmt = select(Task).join(Control).where(*where)
        elif current_user.is_og:
            responsible_user = aliased(User)
            where = [
                Control.status == ControlStatus.ACTIVE,
                or_(
                    Control.responsible_id == current_user.id,
                    Control.backup_id == current_user.id,
                    responsible_user.is_og.is_(True),
                    ),
                ]
            base_stmt = (
                select(Task)
                .join(Control, Task.control_id == Control.id)
                .join(responsible_user, Control.responsible_id == responsible_user.id)
                .where(*where)
            )
        else:
            where = [
                Control.status == ControlStatus.ACTIVE,
                or_(
                    Control.responsible_id == current_user.id,
                    and_(
                        Control.backup_id == current_user.id,
                        Task.user_id != current_user.id,
                        Task.status.in_(
                            [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS]
                        ),
                        Task.deadline_time < func.now(),
                        ),
                    ),
                ]
            base_stmt = (
                select(Task).join(Control, Task.control_id == Control.id).where(*where)
            )

        if status:
            base_stmt = base_stmt.where(Task.status.in_(status))
        if frequency:
            base_stmt = base_stmt.where(Control.frequency == frequency)
        else:
            base_stmt = base_stmt.where(
                not_(
                    and_(
                        Control.frequency == Frequency.BY_QUERY,
                        Task.status.in_([TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS]),
                        )
                )
            )
        if area:
            base_stmt = base_stmt.where(Control.area.in_(area))
        if user_id:
            base_stmt = base_stmt.where(Task.user_id == user_id)
        if responsible_id:
            base_stmt = base_stmt.where(Control.responsible_id == responsible_id)
        if search:
            search_user = aliased(User)
            search_responsible = aliased(User)
            pattern = f"%{search}%"
            base_stmt = (
                base_stmt
                .outerjoin(search_user, Task.user_id == search_user.id)
                .outerjoin(search_responsible, Control.responsible_id == search_responsible.id)
                .where(
                    or_(
                        Control.name.ilike(pattern),
                        search_user.first_name.ilike(pattern),
                        search_user.last_name.ilike(pattern),
                        search_responsible.first_name.ilike(pattern),
                        search_responsible.last_name.ilike(pattern),
                    )
                )
            )

        total_result = await self.db.execute(
            select(func.count()).select_from(base_stmt.subquery())
        )
        total = total_result.scalar_one()

        results = await self.db.execute(
            base_stmt.options(*base_options)
            .order_by(*base_order)
            .offset(offset)
            .limit(limit)
        )
        return list(results.scalars().unique().all()), total

    async def count(self, current_user: User) -> int:
        if current_user.role == UserRoles.ADMIN:
            stmt = select(func.count()).select_from(Task)
        elif current_user.is_og:
            responsible_user = aliased(User)
            stmt = (
                select(func.count())
                .select_from(Task)
                .join(Control, Task.control_id == Control.id)
                .join(responsible_user, Control.responsible_id == responsible_user.id)
                .where(
                    or_(
                        Control.responsible_id == current_user.id,
                        Control.backup_id == current_user.id,
                        responsible_user.is_og.is_(True),
                    )
                )
            )
        else:
            stmt = (
                select(func.count())
                .select_from(Task)
                .join(Control, Task.control_id == Control.id)
                .where(
                    or_(
                        Control.responsible_id == current_user.id,
                        and_(
                            Control.backup_id == current_user.id,
                            Task.user_id != current_user.id,
                            Task.status.in_(
                                [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS]
                            ),
                            Task.deadline_time < func.now(),
                        ),
                    )
                )
            )
        result = await self.db.execute(stmt)
        return result.scalar()

    async def get_all(self, offset: int, limit: int, current_user: User) -> list[Task]:
        if current_user.role == UserRoles.ADMIN:
            results = await self.db.execute(select(Task).offset(offset).limit(limit))
        elif current_user.is_og:
            responsible_user = aliased(User)
            results = await self.db.execute(
                select(Task)
                .join(Control, Task.control_id == Control.id)
                .join(responsible_user, Control.responsible_id == responsible_user.id)
                .where(
                    or_(
                        Control.responsible_id == current_user.id,
                        Control.backup_id == current_user.id,
                        responsible_user.is_og.is_(True),
                    )
                )
                .offset(offset)
                .limit(limit)
            )
        else:
            results = await self.db.execute(
                select(Task)
                .join(Control, Task.control_id == Control.id)
                .where(
                    or_(
                        Control.responsible_id == current_user.id,
                        and_(
                            Control.backup_id == current_user.id,
                            Task.user_id != current_user.id,
                            Task.status.in_(
                                [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS]
                            ),
                            Task.deadline_time < func.now(),
                        ),
                    )
                )
                .offset(offset)
                .limit(limit)
            )

        return list(results.scalars().unique().all())

    async def get_not_started(self) -> list[Task]:
        results = await self.db.execute(
            select(Task).where(Task.status == TaskStatus.NOT_STARTED)
        )
        return list(results.scalars().all())

    async def get_in_progress(self, user_id: int) -> list[Task]:
        results = await self.db.execute(
            select(Task).where(
                Task.status == TaskStatus.IN_PROGRESS, Task.user_id == user_id
            )
        )
        return list(results.scalars().all())

    async def get_complete(self, user_id: int) -> list[Task]:
        results = await self.db.execute(
            select(Task).where(
                Task.status == TaskStatus.COMPLETED, Task.user_id == user_id
            )
        )
        return list(results.scalars().all())

    async def create_task(self, task: Task) -> Task:
        self.db.add(task)
        await self.db.commit()
        return task

    async def update(self, task: Task, task_in: TaskUpdate) -> Task:
        updated_task = task_in.model_dump(exclude_unset=True)
        for key, value in updated_task.items():
            setattr(task, key, value)

        return await self.save_task(task)

    async def delete(self, task: Task) -> None:
        await self.db.delete(task)
        await self.db.commit()

    async def get_overdue(self, user: User) -> list[Task]:
        if user.role == UserRoles.ADMIN:
            result = await self.db.execute(
                select(Task).where(
                    Task.deadline_time < datetime.now(),
                    Task.status.in_([TaskStatus.IN_PROGRESS, TaskStatus.NOT_STARTED]),
                )
            )
        else:
            result = await self.db.execute(
                select(Task).where(
                    Task.deadline_time < datetime.now(),
                    Task.status.in_([TaskStatus.IN_PROGRESS, TaskStatus.NOT_STARTED]),
                    Task.user_id == user.id,
                )
            )

        return list(result.scalars().all())

    async def save_task(self, task: Task) -> Task:
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def generate_tasks_via_db(self) -> dict[str, int]:
        schema = settings.POSTGRES_SCHEMA
        daily = await self.db.scalar(text(f"SELECT {schema}.generate_daily_tasks()"))
        weekly = await self.db.scalar(text(f"SELECT {schema}.generate_weekly_tasks()"))
        monthly = await self.db.scalar(
            text(f"SELECT {schema}.generate_monthly_tasks()")
        )
        quarterly = await self.db.scalar(
            text(f"SELECT {schema}.generate_quarterly_tasks()")
        )
        overdue_updated = await self.db.scalar(
            text(f"SELECT {schema}.update_overdue_task_dates()")
        )
        await self.db.commit()
        return {
            "daily": daily or 0,
            "weekly": weekly or 0,
            "monthly": monthly or 0,
            "quarterly": quarterly or 0,
            "overdue_updated": overdue_updated or 0,
        }

    async def get_tasks_by_weekend_id(self, weekend_id: int) -> list[Task]:
        results = await self.db.execute(
            select(Task).where(Task.weekend_group_id == weekend_id)
        )
        return list(results.scalars().all())
