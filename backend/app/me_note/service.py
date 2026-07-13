from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.me_note.model import MeNote
from app.me_note.repository import MeNoteRepository
from app.me_note.schemas import MeNoteCreate, MeNoteUpdate, MeNoteListResponse, MeNoteWithAll
from app.user.model import User

LOCK_TTL_MINUTES=2


class MeNoteService:
    def __init__(self, db: AsyncSession):
        self.repo = MeNoteRepository(db)

    async def create_note(self, note_in: MeNoteCreate, creater_id: int) -> MeNote:
        new_note = MeNote(**note_in.model_dump(), creater_id=creater_id)
        return await self.repo.create(new_note)

    async def update_note(self, note_id: int, note_in: MeNoteUpdate, current_user: User) -> MeNote:
        note: MeNote | None = await self.repo.db.get(MeNote, note_id)
        if not note:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заметка не найдена")
        if not note.is_editing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Откройте edit mode для редактирование")
        if note.is_editing and note.editor_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Заметка уже редактируется другим пользователем")

        return await self.repo.update(note, note_in, current_user)

    async def delete_notes(self, note_ids: list[int]) -> None:
        result = await self.repo.db.execute(
            select(MeNote).where(MeNote.id.in_(note_ids))
        )
        notes = result.scalars().all()
        if len(notes) != len(set(note_ids)):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Некоторые заметки не найдены")
        await self.repo.delete_many(notes)

    async def get_all_notes(self, page: int, limit: int) -> MeNoteListResponse:
        offset = (page - 1) * limit
        return await self.repo.list_notes(offset, limit)

    async def get_note(self, note_id: int) -> MeNoteWithAll:
        note = await self.repo.get_note(note_id)
        if not note:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заметка не найдена")
        return note

    async def stop_editing(self, note_id: int, current_user: User) -> None:
        note = await self.repo.get_note(note_id)
        if not note:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заметка не найдена")
        await self.repo.stop_editing(note, current_user)

    async def start_editing(self, note_id: int, user: User) -> None:
        note: MeNote | None = await self.repo.db.get(MeNote, note_id)
        if not note:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заметка не найдена")

        lock_expired = note.updated_at < datetime.now(timezone.utc) - timedelta(minutes=LOCK_TTL_MINUTES)
        if note.is_editing and note.editor_id != user.id and not lock_expired:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Заметка уже редактируется другим пользователем")

        await self.repo.start_editng(note, user)


