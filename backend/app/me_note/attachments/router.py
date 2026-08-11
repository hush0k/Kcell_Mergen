from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.db.database import get_db
from app.me_note.attachments.schemas import AttachmentsResponse
from app.me_note.attachments.service import AttachmentsService
from app.user.model import User

router = APIRouter(prefix="/api/v1/me-note/{note_id}/attachments", tags=["MeNoteAttachments"])


def get_attachments_service(db: Annotated[AsyncSession, Depends(get_db)]) -> AttachmentsService:
    return AttachmentsService(db)


ServiceDep = Annotated[AttachmentsService, Depends(get_attachments_service)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("/", response_model=list[AttachmentsResponse], status_code=status.HTTP_201_CREATED)
async def upload_attachments(
        service: ServiceDep,
        note_id: int,
        current_user: CurrentUser,
        files: Annotated[list[UploadFile], File()],
) -> list[AttachmentsResponse]:
    return await service.upload_files(note_id, files, current_user)


@router.get("/", response_model=list[AttachmentsResponse])
async def list_attachments(
        service: ServiceDep,
        note_id: int,
        current_user: CurrentUser,
) -> list[AttachmentsResponse]:
    return await service.list_attachments(note_id, current_user)


@router.get("/{attachment_id}/file")
async def download_attachment(
        service: ServiceDep,
        note_id: int,
        attachment_id: int,
        current_user: CurrentUser,
) -> FileResponse:
    attachment = await service.get_for_download(attachment_id, current_user)
    return FileResponse(
        path=settings.BASE_DIR / attachment.path,
        media_type=attachment.mime_type,
        filename=attachment.original_name,
        content_disposition_type="inline",
    )


@router.delete("/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
        service: ServiceDep,
        note_id: int,
        attachment_id: int,
        current_user: CurrentUser,
) -> None:
    await service.delete_attachment(attachment_id, current_user)
