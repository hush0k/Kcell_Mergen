from datetime import date

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.control.enums import ControlStatus
from app.control.model import Control
from app.task.enums import TaskStatus
from app.task.model import Task
from app.task.schemas import TaskUpdate


class TaskRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, task_id: int) -> Task | None:
        return await self.db.get(Task, task_id)

    async def get_all_with_controls(self) -> list[Task]:
        results = await self.db.execute(
            select(Task)
            .options(
                joinedload(Task.control).joinedload(Control.responsible),
                joinedload(Task.user)
            )
            .join(Control)
            .where(Control.status == ControlStatus.ACTIVE)
            .order_by(Task.date.desc(), Task.id.desc())
        )
        return list(results.scalars().unique().all())

    async def get_all(self, offset: int, limit: int) -> list[Task]:
        results = await self.db.execute(select(Task).offset(offset).limit(limit))
        return list(results.scalars().all())

    async def get_not_started(self) -> list[Task]:
        results = await self.db.execute(
            select(Task)
            .where(Task.status == TaskStatus.NOT_STARTED)
        )
        return list(results.scalars().all())

    async def get_in_progress(self, user_id: int) -> list[Task]:
        results = await self.db.execute(
            select(Task)
            .where(
                Task.status == TaskStatus.IN_PROGRESS,
                Task.user_id == user_id
            )
        )
        return list(results.scalars().all())

    async def get_complete(self, user_id: int) -> list[Task]:
        results = await self.db.execute(
            select(Task)
            .where(
                Task.status == TaskStatus.COMPLETED,
                Task.user_id == user_id
            )
        )
        return list(results.scalars().all())

    async def create_task(self, task: Task) -> Task:
        await self.db.add(task)
        await self.db.commit()
        return task

    async def update(self, task: Task, task_in: TaskUpdate) -> Task:
        updated_task = task_in.model_dump(exclude_unset=True)
        for key, value in updated_task.items():
            setattr(task, key, value)

        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def delete(self, task: Task) -> None:
        await self.db.delete(task)
        await self.db.commit()

    async def get_overdue(self) -> list[Task]:
        result = await self.db.execute(
            select(Task)
            .join(Control)
            .where(
                Task.status.in_([TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS]),
                Task.date < func.current_date(),
                Control.status == "active",
                )
            .options(joinedload(Task.control))
        )
        return list(result.scalars().unique().all())


    async def get_active_by_control_and_date(self, control_id: int, date_: date) -> Task | None:
        result = await self.db.execute(
            select(Task)
            .where(
                Task.control_id == control_id,
                Task.date == date_,
                Task.status.in_([TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS]),
                )
        )
        return result.scalar_one_or_none()


