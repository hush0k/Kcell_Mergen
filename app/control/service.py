from sqlalchemy.ext.asyncio import AsyncSession

from app.control.repository import ControlRepository


class ControlService:
    def __init__(self, db: AsyncSession):
        self.db = ControlRepository(db)
