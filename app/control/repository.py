from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.control.enums import ControlStatus, Frequency
from app.control.model import Control
from app.control.schemas import ControlCreate, ControlUpdate


class ControlRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, control_id: int) -> Control | None:
        return await self.db.get(Control, control_id)

    async def get_all(
        self,
        area: str | None = None,
        status: ControlStatus | None = None,
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
        offset: int = 0,
        limit: int = 20,
    ) -> list[Control]:
        """Делает фильтр по полям и также сортирует список. Добавлена пагинация"""

        query = select(Control)
        if area:
            query = query.where(Control.area == area)
        if status is not None:
            query = query.where(Control.status == status)

        order_column = getattr(Control, order_by)
        if order_type == "desc":
            query = query.order_by(order_column.desc())
        else:
            query = query.order_by(order_column.asc())

        query = query.offset(offset).limit(limit)

        results = await self.db.execute(query)

        return list(results.scalars().all())

    async def create(self, control_in: ControlCreate) -> Control:
        control = Control(**control_in.model_dump())
        self.db.add(control)
        return await self._save_control(control)

    async def update(self, control: Control, control_in: ControlUpdate) -> Control:
        update_data = control_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(control, key, value)

        return await self._save_control(control)

    async def delete(self, control: Control) -> None:
        await self.db.delete(control)
        await self.db.commit()

    async def get_active_by_frequency(self, frequency: Frequency) -> list[Control]:
        """Для TaskService: все активные контроли с заданной частотой, без пагинации"""
        query = (
            select(Control)
            .where(Control.status == ControlStatus.ACTIVE)
            .where(Control.frequency == frequency)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def _save_control(self, control: Control) -> Control:
        await self.db.commit()
        await self.db.refresh(control)
        return control
