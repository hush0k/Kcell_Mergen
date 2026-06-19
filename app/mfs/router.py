from typing import Annotated

from fastapi import APIRouter
from fastapi.params import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.mfs.mfs_audit_log_service import MfsAuditLogService
from app.mfs.model import MfsAuditLog
from app.mfs.shcemas import MfsAuditResponse, MfsAuditCreate
from app.user.model import User

router = APIRouter(prefix="/api/v1/mfs_audit_log", tags=["Mfs Audit Log"])

def get_mfs_audit_log_service(db: Annotated[AsyncSession, Depends(get_db)]) -> MfsAuditLogService:
    return MfsAuditLogService(db)

ServiceDep = Annotated[MfsAuditLogService, Depends(get_mfs_audit_log_service)]
CurrentUser = Annotated[User, Depends(get_current_user)]

@router.get("/", response_model=list[MfsAuditResponse])
async def get_mfs_audit_log(
        service: ServiceDep,
        current_user: CurrentUser,
        page: int = 1,
        limit: int = 200
) -> list[MfsAuditLog]:
    return await service.get_all(current_user, page, limit)

@router.get("/{mfs_id}", response_model=MfsAuditResponse)
async def get_mfs_audit_log_by_id(current_user: CurrentUser, service: ServiceDep, mfs_id: int) -> MfsAuditLog:
    return await service.get_by_id(mfs_id, current_user)
