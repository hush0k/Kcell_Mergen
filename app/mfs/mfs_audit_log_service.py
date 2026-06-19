from fastapi import HTTPException, status as http_status
from sqlalchemy.ext.asyncio import AsyncSession

from app.mfs.model import MfsAuditLog
from app.mfs.repository import MfsAuditLogRepository
from app.mfs.shcemas import MfsAuditCreate
from app.user.enums import UserRoles
from app.user.model import User


class MfsAuditLogService:
    def __init__(self, db: AsyncSession):
        self.repo = MfsAuditLogRepository(db)

    async def create(self, mfs_in: MfsAuditCreate) -> MfsAuditLog:
        return await self.repo.create(mfs_in)

    async def get_by_id(self, mfs_id: int, user: User) -> MfsAuditLog:
        result = await self.repo.get_by_id(mfs_id)
        if not result:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="МФС аудит лог не найден")

        if user.role == UserRoles.ADMIN:
            return result
        else:
            if result.user_id == user.id:
                return result
            else:
                raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Не достаточно прав для просмотра лога")

    async def get_all(self, user: User, page: int = 1, limit: int = 200) -> list[MfsAuditLog]:
        offset = (page - 1) * limit
        if user.role == UserRoles.ADMIN:
            return await self.repo.get_all(offset, limit)
        else:
            return await self.repo.get_all_by_user(user.id, offset, limit)