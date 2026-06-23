from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.mfs.model import MfsAuditLog
from app.mfs.shcemas import MfsAuditCreate


class MfsAuditLogRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, mfs_in: MfsAuditCreate) -> MfsAuditLog:
        new_mfs_audit_log = MfsAuditLog(**mfs_in.model_dump())
        self.db.add(new_mfs_audit_log)
        await self.db.commit()
        return new_mfs_audit_log

    async def get_by_id(self, mfs_id: int) -> MfsAuditLog | None:
        mfs_audit_log = await self.db.execute(
            select(MfsAuditLog).where(MfsAuditLog.id == mfs_id)
        )
        return mfs_audit_log.scalar_one_or_none()

    async def get_all(
        self,
        offset: int = 0,
        limit: int = 200,
    ) -> list[MfsAuditLog]:
        mfs_audit_logs = await self.db.execute(
            select(MfsAuditLog).offset(offset).limit(limit)
        )
        return list(mfs_audit_logs.scalars().all())

    async def get_all_by_user(
        self, user_id: int, offset: int = 0, limit: int = 200
    ) -> list[MfsAuditLog]:
        mfs_audit_logs = await self.db.execute(
            select(MfsAuditLog)
            .where(MfsAuditLog.user_id == user_id)
            .offset(offset)
            .limit(limit)
        )
        return list(mfs_audit_logs.scalars().all())
