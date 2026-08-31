from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.number_information.model import NumberInformationLogin


class LogService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_log(self, sql_request: str) -> int:
        log = NumberInformationLogin(sql_request=sql_request)
        self.db.add(log)
        await self.db.flush()
        return log.id

    async def get_log(self, log_id: int) -> NumberInformationLogin:
        log = await self.db.execute(select(NumberInformationLogin).where(NumberInformationLogin.id==log_id))
        return log.scalar_one_or_none()
