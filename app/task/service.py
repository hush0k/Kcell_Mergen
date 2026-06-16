from datetime import date, timedelta

from fastapi import HTTPException, status as http_status
from sqlalchemy.ext.asyncio import AsyncSession

from app.task.model import Task
from app.task.repository import TaskRepository
from app.task.schemas import TaskCreate, TaskUpdate
from app.user.repository import UserRepository


class TaskService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = TaskRepository(db)
        self.user_repo = UserRepository(db)

    async def get_task_by_id(self, task_id: int) -> Task:
        task = await self.repo.get_by_id(task_id)
        if not task:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Задача не найдена",
            )
        return task

    async def create_task(self, task_in: TaskCreate) -> Task:
        task = Task(**task_in.model_dump())
        return await self.repo.create_task(task)

    async def update_task(self, task_id: int, task_in: TaskUpdate) -> Task:
        task = await self.repo.get_by_id(task_id)
        if not task:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Задача не найдена",
            )
        return await self.repo.update(task, task_in)

    async def delete_task(self, task_id: int) -> None:
        task = await self.repo.get_by_id(task_id)
        if not task:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Задача не найдена",
            )
        await self.repo.delete(task)

    async def get_all(self, offset: int = 0, limit: int = 100) -> list[Task]:
        return await self.repo.get_all(offset=offset, limit=limit)

    async def get_not_started(self) -> list[Task]:
        return await self.repo.get_not_started()

    async def get_in_progress(self, user_id: int) -> list[Task]:
        return await self.repo.get_in_progress(user_id)

    async def get_completed(self, user_id: int) -> list[Task]:
        return await self.repo.get_complete(user_id)

    async def update_overdue_task_dates(self) -> None:
        overdue_tasks = await self.repo.get_overdue()

        for task in overdue_tasks:
            new_date = self._calc_new_date(task)
            if new_date:
                task.date = new_date

        await self.db.commit()

    def _calc_new_date(self, task: Task) -> date | None:
        today = date.today()
        freq = task.control.frequency.lower().strip()

        match freq:
            case "ежедневно" | "daily":
                return today
            case "еженедельно" | "weekly":
                days_until_friday = (4 - today.weekday()) % 7
                return today + timedelta(days=days_until_friday)
            case "ежемесячно" | "monthly":
                return today
            case "ежеквартально" | "quarterly":
                quarter = (today.month - 1) // 3
                quarter_end_month = quarter * 3 + 3
                if quarter_end_month == 12:
                    return date(today.year + 1, 1, 1) - timedelta(days=1)
                return date(today.year, quarter_end_month + 1, 1) - timedelta(days=1)
            case _:
                return None

    async def update_overdue_task_date(self) -> None:
        overdue_tasks = await self.repo.get_overdue()

        for task in overdue_tasks:
            new_date = self._calc_new_date(task)
            if not new_date:
                continue

            existing = await self.repo.get_active_by_control_and_date(
                control_id=task.control_id,
                date_=new_date,
            )

            if existing and existing.id != task.id:
                await self.repo.delete(task)
            else:
                task.date = new_date

        await self.db.commit()

