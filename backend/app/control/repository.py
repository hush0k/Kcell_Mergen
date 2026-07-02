from typing import Literal

from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.control.enums import ControlStatus, Frequency, Area
from app.control.model import Control
from app.control.schemas import ControlCreate, ControlUpdate


class ControlRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, control_id: int) -> Control | None:
        return await self.db.get(Control, control_id)

    async def get_all(
            self,
            area: Area | None = None,
            status: ControlStatus | None = None,
            frequency: Frequency | None = None,
            responsible_id: int | None = None,
            search: str | None = None,
            order_by: Literal[
                "name", "deadline_at", "time_estimate",
                "responsible_id", "backup_id", "status", "created_at",
            ] = "created_at",
            order_type: Literal["desc", "asc"] = "desc",
            offset: int = 0,
            limit: int = 20,
    ) -> tuple[list[Control], int]:
        """Делает фильтр по полям и также сортирует список. Добавлена пагинация"""
        filters = []
        if area:
            filters.append(Control.area == area)
        if status is not None:
            filters.append(Control.status == status)
        if frequency:
            filters.append(Control.frequency == frequency)
        if responsible_id:
            filters.append(Control.responsible_id == responsible_id)
        if search:
            filters.append(Control.name.ilike(f"%{search}%"))

        count_query = select(func.count()).select_from(Control)
        if filters:
            count_query = count_query.where(*filters)
        total = (await self.db.execute(count_query)).scalar_one()

        query = select(Control).options(
            joinedload(Control.responsible),
            joinedload(Control.backup),
        )
        if filters:
            query = query.where(*filters)

        order_column = getattr(Control, order_by)
        query = query.order_by(order_column.desc() if order_type == "desc" else order_column.asc())
        query = query.offset(offset).limit(limit)

        results = await self.db.execute(query)

        return list(results.scalars().all()), total

    async def create(self, control_in: ControlCreate) -> Control:
        original_user_id = control_in.responsible_id
        control = Control(**control_in.model_dump(), original_user_id=original_user_id)
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

    async def change_status(self, control: Control) -> None:
        if control.status == ControlStatus.ACTIVE:
            control.status = ControlStatus.SUSPENDED
        else:
            control.status = ControlStatus.ACTIVE

        await self.db.commit()
        await self.db.refresh(control)


