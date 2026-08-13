from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.tele2.enum import LogStatus
from app.tele2.model import Tele2Log
from app.tele2.schemas import Tele2Create


class Tele2Repository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, numbers: list[str], name: str, user_id: int) -> Tele2Log:
        new_log = Tele2Log(
            name=name,
            numbers=numbers,
            status=LogStatus.SUCCESS,
            user_id=user_id
        )
        self.db.add(new_log)
        await self.db.commit()
        await self.db.refresh(new_log)
        return new_log

    async def get_all(self, offset: int, limit: int) -> tuple[list[Tele2Log], int]:
        logs_result = await self.db.execute(
            select(Tele2Log)
            .order_by(Tele2Log.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        total_result = await self.db.execute(select(func.count()).select_from(Tele2Log))

        return list(logs_result.scalars().all()), total_result.scalar_one()

    async def get_by_id(self, log_id: int) -> Tele2Log:
        log = await self.db.execute(select(Tele2Log).where(Tele2Log.id == log_id))
        return log.scalar_one_or_none()
