from typing import Annotated

from fastapi import APIRouter
from fastapi.params import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.atlas.atlas_service import (
    atlas_configured,
    note_templates_for_api,
    run_atlas_notes,
)
from app.atlas.shcemas import AtlasNoteRequest, AtlasNoteResponse, AtlasStatusResponse
from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.mfs.mfs_audit_log_service import MfsAuditLogService
from app.mfs.shcemas import MfsAuditCreate
from app.user.model import User

router = APIRouter(prefix="/api/v1/atlas", tags=["Atlas"])


def get_audit_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MfsAuditLogService:
    return MfsAuditLogService(db)


CurrentUser = Annotated[User, Depends(get_current_user)]
DbDep = Annotated[AsyncSession, Depends(get_db)]
AuditServiceDep = Annotated[MfsAuditLogService, Depends(get_audit_service)]


@router.get("/status", response_model=AtlasStatusResponse)
async def atlas_status() -> AtlasStatusResponse:
    configured, hint = atlas_configured()
    return AtlasStatusResponse(
        configured=configured, hint=hint, note_templates=note_templates_for_api()
    )


@router.post("/note", response_model=AtlasNoteResponse)
async def atlas_note(
    payload: AtlasNoteRequest,
    db: DbDep,
    audit_service: AuditServiceDep,
    current_user: CurrentUser,
) -> AtlasNoteResponse:
    msisdns, results, summary, audit_action = await run_atlas_notes(
        db, payload.mode, payload.msisdns, payload.template
    )

    audit_id = None
    audit_warning = None
    try:
        log = await audit_service.create(
            MfsAuditCreate(
                user_id=current_user.id,
                username=current_user.username,
                action=audit_action,
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

    return AtlasNoteResponse(
        mode=payload.mode,
        template=payload.template if payload.mode == "add" else None,
        results=results,
        summary=summary,
        audit_id=audit_id,
        audit_warning=audit_warning,
    )
