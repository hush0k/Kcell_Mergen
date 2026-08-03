from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.me_note.note.model import MeNote, MeNoteLink, Tags
from app.me_note.note.schemas import MeNoteUpdate, MeNoteListResponse, MeNoteWithAll
from app.user.enums import UserRoles
from app.user.model import User

LOCK_TTL_MINUTES = 1


class MeNoteRepository:
    cnt: int = 0

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _is_lock_expired(self, note: MeNote) -> bool:
        if not note.is_editing or note.editing_started_at is None:
            return False
        return note.editing_started_at < datetime.now(timezone.utc) - timedelta(minutes=LOCK_TTL_MINUTES)

    async def _release_if_expired(self, note: MeNote) -> None:
        if not await self._is_lock_expired(note):
            return
        note.is_editing = False
        note.editor_id = None
        note.editing_started_at = None
        await self.db.commit()
        await self.db.refresh(note)

    async def release_expired_locks(self) -> int:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=LOCK_TTL_MINUTES)
        result = await self.db.execute(
            update(MeNote)
            .where(MeNote.is_editing.is_(True), MeNote.editing_started_at < cutoff)
            .values(is_editing=False, editor_id=None, editing_started_at=None)
        )
        await self.db.commit()
        return result.rowcount or 0

    async def create(self, note_in: MeNote) -> MeNote:
        note_exists = await self.db.scalar(select(MeNote).where(MeNote.name == note_in.name))
        if note_exists:
            self.cnt += 1
            note_in.name = str(note_in.name + f" ({self.cnt})")
        self.db.add(note_in)
        await self.db.commit()
        await self.db.refresh(note_in, attribute_names=["tags", "can_edit", "can_read"])
        return note_in

    async def update(self, note: MeNote, note_in: MeNoteUpdate, current_user: User, tags: list[Tags] | None = None) -> MeNote:
        updated_note = note_in.model_dump(exclude_unset=True, exclude={"tags"})
        for key, value in updated_note.items():
            setattr(note, key, value)

        if tags is not None:
            note.tags = tags

        note.last_modifier_id = current_user.id

        await self.db.commit()
        await self.db.refresh(note, attribute_names=["tags", "can_edit", "can_read"])
        return note

    async def stop_editing(self, note: MeNote, user: User) -> None:
        if note.editor_id != user.id:
            return
        note.is_editing = False
        note.editor_id = None
        note.editing_started_at = None

        await self.db.commit()
        await self.db.refresh(note)

    async def delete_many(self, notes: list[MeNote]) -> None:
        for note in notes:
            await self.db.delete(note)
        await self.db.commit()

    async def list_notes(self, current_user_id: int, offset: int = 0, limit: int = 0) -> MeNoteListResponse:
        total = await self.db.scalar(select(func.count()).select_from(MeNote))
        user = await self.db.get(User, current_user_id)

        base_query = select(MeNote).options(
            joinedload(MeNote.tags),
            joinedload(MeNote.can_edit),
            joinedload(MeNote.can_read),
        )
        if user.role != UserRoles.ADMIN:
            base_query = base_query.where(MeNote.can_read.any(User.id == current_user_id))

        notes = await self.db.execute(
            base_query.order_by(MeNote.updated_at.desc()).offset(offset).limit(limit)
        )
        list_note = list(notes.scalars().unique().all())

        expired_ids = [n.id for n in list_note if await self._is_lock_expired(n)]

        if expired_ids:
            await self.db.execute(
                update(MeNote)
                .where(MeNote.id.in_(expired_ids))
                .values(is_editing=False, editor_id=None, editing_started_at=None)
            )
            await self.db.commit()
            for n in list_note:
                if n.id in expired_ids:
                    n.is_editing = False
                    n.editor_id = None
                    n.editing_started_at = None

        return MeNoteListResponse(total=total, list=list_note, offset=offset, limit=limit)

    async def get_note(self, note_id: int) -> MeNoteWithAll | None:
        note = await self.db.scalar(
            select(MeNote)
            .options(
                joinedload(MeNote.creater),
                joinedload(MeNote.last_modifier),
                joinedload(MeNote.editor),
                joinedload(MeNote.tags),
                joinedload(MeNote.can_edit),
                joinedload(MeNote.can_read),
            )
            .where(MeNote.id == note_id)
        )
        if note is not None:
            await self._release_if_expired(note)

        return note

    async def start_editng(self, note: MeNote, user: User) -> None:
        note.is_editing = True
        note.editor_id = user.id
        note.editing_started_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(note)

    async def get_by_id(self, note_id: int) -> MeNote | None:
        note = await self.db.scalar(
            select(MeNote)
            .options(
                joinedload(MeNote.tags),
                joinedload(MeNote.can_edit),
                joinedload(MeNote.can_read),
            )
            .where(MeNote.id == note_id)
        )
        if note is not None:
            await self._release_if_expired(note)
        return note

    async def search_by_name(self, query: str, limit: int = 10) -> list[MeNote]:
        result = await self.db.execute(
            select(MeNote)
            .where(MeNote.name.ilike(f"%{query}%"))
            .order_by(MeNote.name)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def sync_links(self, note_id: int, target_note_ids: set[int]) -> None:
        await self.db.execute(
            delete(MeNoteLink).where(MeNoteLink.source_note_id == note_id)
        )
        for target_id in target_note_ids:
            self.db.add(MeNoteLink(source_note_id=note_id, target_note_id=target_id))
        await self.db.commit()

    async def get_backlinks(self, note_id: int) -> list[MeNote]:
        result = await self.db.execute(
            select(MeNote)
            .join(MeNoteLink, MeNoteLink.source_note_id == MeNote.id)
            .where(MeNoteLink.target_note_id == note_id)
        )
        return list(result.scalars().unique().all())

    async def get_all_links(self) -> list[MeNoteLink]:
        result = await self.db.execute(select(MeNoteLink))
        return list(result.scalars().all())

    async def get_all_nodes(self) -> list[MeNote]:
        result = await self.db.execute(select(MeNote))
        return list(result.scalars().all())

    async def give_reader_root(self, note: MeNote, user_id: int) -> MeNote:
        if user_id not in {user.id for user in note.can_read}:
            target_user = await self.db.get(User, user_id)
            note.can_read.append(target_user)
            await self.db.commit()
            await self.db.refresh(note)
        return note

    async def give_editor_root(self, note: MeNote, user_id: int) -> MeNote:
        changed = False
        target_user = None

        if user_id not in {user.id for user in note.can_edit}:
            target_user = await self.db.get(User, user_id)
            note.can_edit.append(target_user)
            changed = True

        if user_id not in {user.id for user in note.can_read}:
            target_user = target_user or await self.db.get(User, user_id)
            note.can_read.append(target_user)
            changed = True

        if changed:
            await self.db.commit()
            await self.db.refresh(note)

        return note

    async def remove_reader_root(self, note: MeNote, user_id: int) -> MeNote:
        can_read_ids = {u.id for u in note.can_read}
        can_edit_ids = {u.id for u in note.can_edit}

        if user_id not in can_read_ids and user_id not in can_edit_ids:
            return note

        note.can_read = [u for u in note.can_read if u.id != user_id]
        note.can_edit = [u for u in note.can_edit if u.id != user_id]
        await self.db.commit()
        await self.db.refresh(note)

        return note

    async def remove_editor_root(self, note: MeNote, user_id: int) -> MeNote:
        if user_id not in {u.id for u in note.can_edit}:
            return note

        note.can_edit = [u for u in note.can_edit if u.id != user_id]
        await self.db.commit()
        await self.db.refresh(note)

        return note