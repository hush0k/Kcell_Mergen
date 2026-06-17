from calendar import monthrange
from datetime import date, datetime, time, timedelta

from fastapi import HTTPException
from fastapi import status as http_status
from sqlalchemy.ext.asyncio import AsyncSession

from app.control.repository import ControlRepository
from app.task.enums import TaskStatus
from app.task.model import Task
from app.task.repository import TaskRepository
from app.task.schemas import TaskCreate, TaskUpdate
from app.user.repository import UserRepository


class TaskService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = TaskRepository(db)
        self.control_repo = ControlRepository(db)
        self.user_repo = UserRepository(db)

    async def get_task_by_id(self, task_id: int) -> Task:
        """Возвращает задачу по id. Кидает 404 если не найдена."""
        task = await self.repo.get_by_id(task_id)
        if not task:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Задача не найдена",
            )
        return task

    async def create_task(self, task_in: TaskCreate) -> Task:
        """Создает задачу. Автоматически вычисляет deadline на основе частоты контрола.
        Задачи по запросу получают дедлайн 100 лет — они бесконечные до выполнения."""
        control = await self.control_repo.get_by_id(task_in.control_id)
        if not control:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Контроль не найден",
            )

        today = date.today()
        deadline = date.today()
        match control.frequency:
            case "ежедневно":
                deadline = datetime.combine(today, time(23, 59, 59))
            case "еженедельно":
                deadline = datetime.combine(
                    today + timedelta(6 - today.weekday()), time(23, 59, 59)
                )
            case "ежемесячно":
                last_day = date(
                    today.year, today.month, monthrange(today.year, today.month)[1]
                )
                deadline = datetime.combine(last_day, time(23, 59, 59))
            case "ежеквартально":
                if today.month in [1, 2, 3]:
                    deadline = datetime.combine(date(today.year, 3, 31), time(23, 59, 59))
                elif today.month in [4, 5, 6]:
                    deadline = datetime.combine(date(today.year, 6, 30), time(23, 59, 59))
                elif today.month in [7, 8, 9]:
                    deadline = datetime.combine(date(today.year, 9, 30), time(23, 59, 59))
                elif today.month in [10, 11, 12]:
                    deadline = datetime.combine(date(today.year, 12, 31), time(23, 59, 59))
            case _:
                deadline = datetime.now() + timedelta(days=365 * 100)

        task = Task(**task_in.model_dump(), deadline_time=deadline)
        return await self.repo.create_task(task)

    async def update_task(self, task_id: int, task_in: TaskUpdate) -> Task:
        """Обновляет данные задачи по id. Кидает 404 если не найдена."""
        task = await self.repo.get_by_id(task_id)
        if not task:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Задача не найдена",
            )
        return await self.repo.update(task, task_in)

    async def delete_task(self, task_id: int) -> None:
        """Удаляет задачу по id. Кидает 404 если не найдена."""
        task = await self.repo.get_by_id(task_id)
        if not task:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Задача не найдена",
            )
        await self.repo.delete(task)

    async def get_all(self, offset: int = 0, limit: int = 100) -> list[Task]:
        """Возвращает все задачи с пагинацией."""
        return await self.repo.get_all(offset=offset, limit=limit)

    async def get_not_started(self) -> list[Task]:
        """Возвращает все задачи со статусом NOT_STARTED."""
        return await self.repo.get_not_started()

    async def get_in_progress(self, user_id: int) -> list[Task]:
        """Возвращает задачи пользователя со статусом IN_PROGRESS."""
        return await self.repo.get_in_progress(user_id)

    async def get_completed(self, user_id: int) -> list[Task]:
        """Возвращает завершённые задачи пользователя."""
        return await self.repo.get_complete(user_id)

    async def get_overdue(self, user_id: int) -> list[Task]:
        """Возвращает просроченные задачи. Админ видит все, обычный пользователь только свои."""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден",
            )
        return await self.repo.get_overdue(user)

    async def start_task(self, task_id: int, user_id: int) -> Task:
        """Берёт задачу в работу. Ставит статус IN_PROGRESS, фиксирует start_time и назначает пользователя."""
        task = await self.repo.get_by_id(task_id)
        if not task:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Задача не найдена"
            )
        if task.status == TaskStatus.COMPLETED or task.status == TaskStatus.IN_PROGRESS:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Задача уже взята или уже завершена",
            )
        task_in: TaskUpdate = TaskUpdate(
            status=TaskStatus.IN_PROGRESS,
            start_time=datetime.now(),
            user_id=user_id,
        )
        return await self.repo.update(task, task_in)

    async def complete_task(self, task_id: int) -> Task:
        """Завершает задачу. Ставит статус COMPLETED и фиксирует end_time. Кидает 400 если задача не IN_PROGRESS."""
        task = await self.repo.get_by_id(task_id)
        if not task:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Задача не найдена"
            )
        if task.status != TaskStatus.IN_PROGRESS:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Задача ещё не взята никем или уже завершена",
            )
        task_in: TaskUpdate = TaskUpdate(
            status=TaskStatus.COMPLETED, end_time=datetime.now()
        )
        return await self.repo.update(task, task_in)

    async def generate_tasks_via_db(self) -> None:
        """Запускает генерацию задач через SQL функции в БД."""
        await self.repo.generate_tasks_via_db()