from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.me_note.note.model import MeNote
from app.me_note.note.repository import MeNoteRepository
from app.me_note.note.schemas import (
    MeNoteCreate,
    MeNoteUpdate,
    MeNoteListResponse,
    MeNoteWithAll,
    MeNoteSearchResult,
    MeNoteGraphNode,
    MeNoteGraphEdge,
    MeNoteGraphResponse,
)
from app.me_note.tags.repository import TagsRepository
from app.me_note.tags.service import TagService
from app.user.enums import UserRoles
from app.user.model import User
from app.user.repository import UserRepository


class MeNoteService:
    def __init__(self, db: AsyncSession):
        self.repo = MeNoteRepository(db)
        self.user_repo = UserRepository(db)
        self.tags_service = TagService(TagsRepository(db))

    async def create_note(self, note_in: MeNoteCreate, creater_id: int) -> MeNote:
        tags = await self.tags_service.get_or_create(names=note_in.tags)
        creater = await self.user_repo.get_by_id(creater_id)
        admins = await self.user_repo.get_admins()
        editors = {creater.id: creater}
        for admin in admins:
            editors.setdefault(admin.id, admin)
        new_note = MeNote(
            **note_in.model_dump(exclude={"tags"}),
            creater_id=creater_id,
            tags=tags,
            can_edit=list(editors.values()),
            can_read=list(editors.values()),
        )

        return await self.repo.create(new_note)

    async def update_note(self, note_id: int, note_in: MeNoteUpdate, current_user: User) -> MeNote:
        note: MeNote | None = await self.repo.get_by_id(note_id)
        if not note:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заметка не найдена")
        if not note.is_editing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Откройте edit mode для редактирование")
        if note.is_editing and note.editor_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Заметка уже редактируется другим пользователем")
        if current_user.id not in {user.id for user in note.can_edit}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="У вас нет прав для редактирование этого документа")

        tags = await self.tags_service.get_or_create(note_in.tags) if note_in.tags is not None else None
        updated_note = await self.repo.update(note, note_in, current_user, tags)

        if note_in.content is not None:
            wikilink_ids = self._extract_wikilink_ids(note_in.content)
            await self.repo.sync_links(note_id, wikilink_ids)

        return updated_note

    @staticmethod
    def _extract_wikilink_ids(content: dict[str, Any]) -> set[int]:
        note_ids: set[int] = set()

        def walk(node: Any) -> None:
            if isinstance(node, dict):
                if node.get("type") == "wikilink":
                    note_id = node.get("attrs", {}).get("noteId")
                    if note_id is not None:
                        note_ids.add(int(note_id))
                for child in node.get("content", []) or []:
                    walk(child)
            elif isinstance(node, list):
                for item in node:
                    walk(item)

        walk(content)
        return note_ids

    async def search_notes(self, query: str, limit: int = 10) -> list[MeNoteSearchResult]:
        notes = await self.repo.search_by_name(query, limit)
        return [MeNoteSearchResult.model_validate(note) for note in notes]

    async def get_backlinks(self, note_id: int) -> list[MeNote]:
        return await self.repo.get_backlinks(note_id)

    async def get_graph(self) -> MeNoteGraphResponse:
        nodes = await self.repo.get_all_nodes()
        links = await self.repo.get_all_links()
        return MeNoteGraphResponse(
            nodes=[MeNoteGraphNode(id=note.id, name=note.name) for note in nodes],
            edges=[
                MeNoteGraphEdge(source=link.source_note_id, target=link.target_note_id)
                for link in links
            ],
        )

    async def delete_notes(self, note_ids: list[int]) -> None:
        result = await self.repo.db.execute(
            select(MeNote).where(MeNote.id.in_(note_ids))
        )
        notes = result.scalars().all()
        if len(notes) != len(set(note_ids)):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Некоторые заметки не найдены")
        await self.repo.delete_many(notes)

    async def get_all_notes(self, page: int, limit: int, user: User) -> MeNoteListResponse:
        offset = (page - 1) * limit
        return await self.repo.list_notes(user.id, offset, limit)

    async def get_note(self, note_id: int, user: User) -> MeNoteWithAll:
        note = await self.repo.get_note(note_id)
        if not note:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заметка не найдена")
        if user.id not in {u.id for u in note.can_read} and user.role != UserRoles.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "message": "У вас нет прав для чтения этого документа",
                    "note_id": note.id,
                    "note_name": note.name,
                    "owner": (
                        {
                            "id": note.creater.id,
                            "first_name": note.creater.first_name,
                            "last_name": note.creater.last_name,
                            "username": note.creater.username,
                        }
                        if note.creater
                        else None
                    ),
                },
            )
        return note

    async def stop_editing(self, note_id: int, current_user: User) -> None:
        note = await self.repo.get_note(note_id)
        if not note:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заметка не найдена")
        await self.repo.stop_editing(note, current_user)

    async def start_editing(self, note_id: int, user: User) -> None:
        note: MeNote | None = await self.repo.get_by_id(note_id)
        if not note:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заметка не найдена")

        if note.is_editing and note.editor_id != user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Заметка уже редактируется другим пользователем")

        await self.repo.start_editng(note, user)

    async def give_reader_root(self, note_id: int, target_user_id: int, current_user: User) -> MeNote:
        note = await self.repo.get_note(note_id)
        if not note:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заметка не найдена")
        if note.creater_id != current_user.id and current_user.role != UserRoles.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "message": "У вас нет прав для этого действие",
                    "note_id": note.id,
                    "note_name": note.name,
                    "owner": (
                        {
                            "id": note.creater.id,
                            "first_name": note.creater.first_name,
                            "last_name": note.creater.last_name,
                            "username": note.creater.username,
                        }
                        if note.creater
                        else None
                    ),
                })
        return await self.repo.give_reader_root(note, target_user_id)

    async def give_editor_root(self, note_id: int, target_user_id: int, current_user: User) -> MeNote:
        note = await self.repo.get_note(note_id)
        if not note:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заметка не найдена")
        if note.creater_id != current_user.id and current_user.role != UserRoles.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "message": "У вас нет прав для этого действие",
                    "note_id": note.id,
                    "note_name": note.name,
                    "owner": (
                        {
                            "id": note.creater.id,
                            "first_name": note.creater.first_name,
                            "last_name": note.creater.last_name,
                            "username": note.creater.username,
                        }
                        if note.creater
                        else None
                    ),
                })
        return await self.repo.give_editor_root(note, target_user_id)

    async def remove_reader_root(self, note_id: int, target_user_id: int, current_user: User) -> MeNote:
        note = await self.repo.get_note(note_id)
        if not note:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заметка не найдена")
        if note.creater_id != current_user.id and current_user.role != UserRoles.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "message": "У вас нет прав для этого действие",
                    "note_id": note.id,
                    "note_name": note.name,
                    "owner": (
                        {
                            "id": note.creater.id,
                            "first_name": note.creater.first_name,
                            "last_name": note.creater.last_name,
                            "username": note.creater.username,
                        }
                        if note.creater
                        else None
                    ),
                })
        target_user = await self.repo.db.get(User, target_user_id)
        if target_user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
        if target_user_id == current_user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя удалить самого себя")
        if target_user.role == UserRoles.ADMIN:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя удалить администратора")
        return await self.repo.remove_reader_root(note, target_user_id)

    async def remove_editor_root(self, note_id: int, target_user_id: int, current_user: User) -> MeNote:
        note = await self.repo.get_note(note_id)
        if not note:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заметка не найдена")
        if note.creater_id != current_user.id and current_user.role != UserRoles.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "message": "У вас нет прав для этого действие",
                    "note_id": note.id,
                    "note_name": note.name,
                    "owner": (
                        {
                            "id": note.creater.id,
                            "first_name": note.creater.first_name,
                            "last_name": note.creater.last_name,
                            "username": note.creater.username,
                        }
                        if note.creater
                        else None
                    ),
                })
        target_user = await self.repo.db.get(User, target_user_id)
        if target_user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
        if target_user_id == current_user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя удалить самого себя")
        if target_user.role == UserRoles.ADMIN:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя удалить администратора")
        return await self.repo.remove_editor_root(note, target_user_id)

