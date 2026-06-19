from typing import Annotated

from fastapi import APIRouter
from fastapi.params import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.db.database import get_db
from app.mfs.blacklist_service import MfsBlacklistService
from app.mfs.database import BlacklistDB
from app.mfs.mfs_audit_log_service import MfsAuditLogService
from app.mfs.model import MfsAuditLog
from app.mfs.shcemas import (
    MfsActionRequest,
    MfsActionResponse,
    MfsAuditCreate,
    MfsAuditResponse,
)
from app.user.model import User

router = APIRouter(prefix="/api/v1/mfs", tags=["Mfs Audit Log"])


def get_mfs_audit_log_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MfsAuditLogService:
    return MfsAuditLogService(db)


def get_blacklist_service(db: BlacklistDB) -> MfsBlacklistService:
    return MfsBlacklistService(db)


def get_audit_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MfsAuditLogService:
    return MfsAuditLogService(db)


ServiceDep = Annotated[MfsAuditLogService, Depends(get_mfs_audit_log_service)]
CurrentUser = Annotated[User, Depends(get_current_user)]
BlacklistServiceDep = Annotated[MfsBlacklistService, Depends(get_blacklist_service)]
AuditServiceDep = Annotated[MfsAuditLogService, Depends(get_audit_service)]


@router.get("/", response_model=list[MfsAuditResponse])
async def get_mfs_audit_log(
    service: ServiceDep, current_user: CurrentUser, page: int = 1, limit: int = 200
) -> list[MfsAuditLog]:
    return await service.get_all(current_user, page, limit)


@router.get("/{mfs_id}", response_model=MfsAuditResponse)
async def get_mfs_audit_log_by_id(
    current_user: CurrentUser, service: ServiceDep, mfs_id: int
) -> MfsAuditLog:
    return await service.get_by_id(mfs_id, current_user)


@router.post("/action", response_model=MfsActionResponse)
async def mfs_action(
    payload: MfsActionRequest,
    blacklist_service: BlacklistServiceDep,
    audit_service: AuditServiceDep,
    current_user: CurrentUser,
) -> MfsActionResponse:
    author = settings.MFS_BLACKLIST_AUTHOR or current_user.username

    msisdns, results, summary = await blacklist_service.run_action(
        payload.action, payload.msisdns, author
    )

    audit_id = None
    audit_warning = None
    try:
        log = await audit_service.create(
            MfsAuditCreate(
                user_id=current_user.id,
                username=current_user.username,
                action=payload.action,
                msisdns_text="\n".join(msisdns),
                results_json=results,
                summary_ok=summary["ok"],
                summary_skipped=summary["skipped"],
                summary_error=summary["error"],
            )
        )
        audit_id = log.id
    except Exception as e:
        audit_warning = f"Операция выполнена, но запись в журнал не сохранена: {e}"

    return MfsActionResponse(
        action=payload.action,
        results=results,
        summary=summary,
        audit_id=audit_id,
        audit_warning=audit_warning,
    )
