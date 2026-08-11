from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.me_note.attachments.repository import AttachmentsRepository
from app.me_note.attachments.schemas import AttachmentsCreate
from app.me_note.attachments.storage import delete_upload_file, save_upload_file
from app.me_note.note.model import AttachedFiles, MeNote
from app.me_note.note.repository import MeNoteRepository
from app.user.enums import UserRoles
from app.user.model import User

MAX_FILES_PER_UPLOAD = 20


class AttachmentsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AttachmentsRepository(db)
        self.note_repo = MeNoteRepository(db)

    async def _get_note_or_404(self, note_id: int) -> MeNote:
        note = await self.note_repo.get_note(note_id)
        if not note:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заметка не найдена")
        return note

    @staticmethod
    def _ensure_can_read(note: MeNote, user: User) -> None:
        if user.role == UserRoles.ADMIN:
            return
        if user.id not in {u.id for u in note.can_read}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="У вас нет прав для чтения этого документа")

    @staticmethod
    def _ensure_can_edit(note: MeNote, user: User) -> None:
        if user.role == UserRoles.ADMIN:
            return
        if user.id not in {u.id for u in note.can_edit}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="У вас нет прав для редактирования этого документа")

    async def upload_files(self, note_id: int, files: list[UploadFile], current_user: User) -> list[AttachedFiles]:
        note = await self._get_note_or_404(note_id)
        self._ensure_can_edit(note, current_user)

        if not files:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Не выбраны файлы")
        if len(files) > MAX_FILES_PER_UPLOAD:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Нельзя загрузить больше {MAX_FILES_PER_UPLOAD} файлов за раз",
            )

        created: list[AttachedFiles] = []
        for file in files:
            path, mime_type, size = await save_upload_file(file)
            attachment = await self.repo.create(
                AttachmentsCreate(
                    note_id=note_id,
                    path=path,
                    original_name=file.filename or "file",
                    mime_type=mime_type,
                    size_bytes=size,
                )
            )
            created.append(attachment)
        return created

    async def list_attachments(self, note_id: int, current_user: User) -> list[AttachedFiles]:
        note = await self._get_note_or_404(note_id)
        self._ensure_can_read(note, current_user)
        return await self.repo.list_by_note(note_id)

    async def get_for_download(self, attachment_id: int, current_user: User) -> AttachedFiles:
        attachment = await self.repo.get_by_id(attachment_id)
        if not attachment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Файл не найден")
        note = await self._get_note_or_404(attachment.note_id)
        self._ensure_can_read(note, current_user)
        return attachment

    async def delete_attachment(self, attachment_id: int, current_user: User) -> None:
        attachment = await self.repo.get_by_id(attachment_id)
        if not attachment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Файл не найден")
        note = await self._get_note_or_404(attachment.note_id)
        self._ensure_can_edit(note, current_user)

        path = attachment.path
        await self.repo.delete(attachment)
        delete_upload_file(path)
