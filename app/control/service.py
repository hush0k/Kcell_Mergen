from typing import Literal

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.control.enums import ControlStatus
from app.control.model import Control
from app.control.repository import ControlRepository
from app.control.schemas import ControlCreate, ControlUpdate
from app.task.schemas import TaskCreate


class ControlService:
    """Сервис для управления контроллерами. Содержит бизнес-логику и делегирует работу с БД в репозиторий."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ControlRepository(db)

    async def create_control(self, control_in: ControlCreate) -> Control:
        """Создает новый контроллер в базе данных.

        Args:
            control_in: Данные для создания контроллера.

        Returns:
            Созданный объект контроллера.
        """
        from app.task.service import TaskService

        control = await self.repo.create(control_in)

        task_service = TaskService(self.db)
        task_in = TaskCreate(control_id=control.id)
        await task_service.create_task(task_in)

        return control

    async def update_control(
        self, control_in: ControlUpdate, control_id: int
    ) -> Control:
        """Обновляет существующий контроллер по его ID.

        Args:
            control_in: Новые данные для обновления.
            control_id: ID контроллера, который нужно обновить.

        Returns:
            Обновлённый объект контроллера.

        Raises:
            HTTPException: 404, если контроллер с таким ID не найден.
        """
        control = await self.get_control_by_id(control_id)
        return await self.repo.update(control, control_in)

    async def delete_control(self, control_id: int) -> None:
        """Удаляет контроллер по его ID.

        Args:
            control_id: ID контроллера, который нужно удалить.

        Raises:
            HTTPException: 404, если контроллер с таким ID не найден.
        """
        control = await self.get_control_by_id(control_id)
        await self.repo.delete(control)

    async def get_control_by_id(self, control_id: int) -> Control:
        """Возвращает контроллер по его ID.

        Args:
            control_id: ID искомого контроллера.

        Returns:
            Найденный объект контроллера.

        Raises:
            HTTPException: 404, если контроллер с таким ID не найден.
        """
        control = await self.repo.get_by_id(control_id)
        if not control:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Контроллер не найден"
            )
        return control

    async def get_controls(
        self,
        area: str | None = None,
        control_status: ControlStatus | None = None,
        order_by: Literal[
            "name",
            "deadline_at",
            "time_estimate",
            "responsible_id",
            "backup_id",
            "status",
            "created_at",
        ] = "created_at",
        order_type: Literal["desc", "asc"] = "desc",
        page: int = 1,
        per_page: int = 20,
    ) -> list[Control]:
        """Возвращает список контроллеров с фильтрацией, сортировкой и пагинацией.

        Args:
            area: Фильтр по зоне (необязательный).
            control_status: Фильтр по статусу контроллера (необязательный).
            order_by: Поле, по которому выполняется сортировка. По умолчанию — created_at.
            order_type: Направление сортировки — desc (убыв.) или asc (возр.). По умолчанию — desc.
            page: Номер страницы для пагинации. По умолчанию — 1.
            per_page: Количество записей на странице. По умолчанию — 20.

        Returns:
            Список объектов контроллеров, соответствующих фильтрам.
        """
        offset = (page - 1) * per_page
        return await self.repo.get_all(
            area=area,
            status=control_status,
            order_by=order_by,
            order_type=order_type,
            offset=offset,
            limit=per_page,
        )
