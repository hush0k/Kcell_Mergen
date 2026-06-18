from datetime import datetime

from sqlalchemy import or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, joinedload

from app.control.enums import ControlStatus
from app.control.model import Control
from app.core.config import settings
from app.task.enums import TaskStatus
from app.task.model import Task
from app.task.schemas import TaskUpdate
from app.user.enums import UserRoles
from app.user.model import User


class TaskRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, task_id: int) -> Task | None:
        return await self.db.get(Task, task_id)

    async def get_all_with_controls(
        self, offset: int = 0, limit: int = 20
    ) -> list[Task]:
        results = await self.db.execute(
            select(Task)
            .options(
                joinedload(Task.control).joinedload(Control.responsible),
                joinedload(Task.user),
            )
            .join(Control)
            .where(Control.status == ControlStatus.ACTIVE)
            .order_by(Task.created_at.desc(), Task.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(results.scalars().unique().all())

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
                        responsible_user.is_og,
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
                        Control.backup_id == current_user.id,
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

    async def generate_tasks_via_db(self) -> None:
        schema = settings.POSTGRES_SCHEMA
        await self.db.execute(text(f"SELECT {schema}.generate_daily_tasks()"))
        await self.db.execute(text(f"SELECT {schema}.generate_weekly_tasks()"))
        await self.db.execute(text(f"SELECT {schema}.generate_monthly_tasks()"))
        await self.db.execute(text(f"SELECT {schema}.generate_quarterly_tasks()"))
        await self.db.execute(text(f"SELECT {schema}.update_overdue_task_dates()"))
        await self.db.commit()

    async def get_tasks_by_weekend_id(self, weekend_id: int) -> list[Task]:
        results = await self.db.execute(
            select(Task).where(Task.weekend_group_id == weekend_id)
        )
        return list(results.scalars().all())
