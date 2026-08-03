from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.me_note.note.model import Directory, MeNote
from app.me_note.directory.directory_schemas import DirectoryUpdate, DirectoryListResponse


class DirectoryRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, directory: Directory) -> Directory:
        self.db.add(directory)
        await self.db.commit()
        await self.db.refresh(directory)
        return directory

    async def update(self, directory: Directory, directory_in: DirectoryUpdate) -> Directory:
        for key, value in directory_in.model_dump(exclude_unset=True).items():
            setattr(directory, key, value)
        await self.db.commit()
        await self.db.refresh(directory)
        return directory

    async def delete(self, directory: Directory) -> None:
        await self.db.delete(directory)
        await self.db.commit()

    async def list_directories(self, offset: int = 0, limit: int = 20) -> DirectoryListResponse:
        total = await self.db.scalar(select(func.count()).select_from(Directory))
        result = await self.db.execute(select(Directory).offset(offset).limit(limit))
        return DirectoryListResponse(total=total, list=list(result.scalars().all()), offset=offset, limit=limit)

    async def get_by_id(self, directory_id: int) -> Directory:
        result = await self.db.execute(
            select(Directory)
            .options(
                joinedload(Directory.files).joinedload(MeNote.tags),
                joinedload(Directory.files).joinedload(MeNote.creater),
                joinedload(Directory.files).joinedload(MeNote.last_modifier),
                joinedload(Directory.files).joinedload(MeNote.editor),
            )
            .where(Directory.id == directory_id)
        )
        return result.unique().scalar_one_or_none()