from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.me_note.model import MeNote
from app.me_note.schemas import MeNoteCreate, MeNoteUpdate, MeNoteListResponse, MeNoteWithAll
from app.user.model import User


class MeNoteRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, note_in: MeNote) -> MeNote:
        self.db.add(note_in)
        await self.db.commit()
        await self.db.refresh(note_in)
        return note_in


    async def update(self, note: MeNote, note_in: MeNoteUpdate, current_user: User) -> MeNote:
        updated_note = note_in.model_dump(exclude_unset=True)
        for key, value in updated_note.items():
            setattr(note, key, value)

        note.last_modifier_id = current_user.id
        note.editor_id = None
        note.is_editing = False

        await self.db.commit()
        await self.db.refresh(note)
        return note


    async def delete_many(self, notes: list[MeNote]) -> None:
        for note in notes:
            await self.db.delete(note)
        await self.db.commit()

    async def list_notes(self, offset: int = 0, limit: int = 0) -> MeNoteListResponse:
        total = await self.db.scalar(select(func.count()).select_from(MeNote))
        notes = await self.db.execute(select(MeNote).offset(offset).limit(limit))
        list_note = list(notes.scalars().all())
        return MeNoteListResponse(total=total, list=list_note, offset=offset, limit=limit)


    async def get_note(self, note_id: int) -> MeNoteWithAll | None:
        note = await self.db.scalar(
            select(MeNote)
            .options(
                joinedload(MeNote.creater),
                joinedload(MeNote.last_modifier),
                joinedload(MeNote.editor),
            )
            .where(MeNote.id == note_id)
        )

        return note

    async def start_editng(self, note: MeNote, user: User) -> None:
        note.is_editing = True
        note.editor_id = user.id
        await self.db.commit()
        await self.db.refresh(note)

