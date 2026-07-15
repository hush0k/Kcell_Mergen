from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.me_note.note.model import Directory
from app.me_note.directory.directory_repository import DirectoryRepository
from app.me_note.directory.directory_schemas import DirectoryCreate, DirectoryUpdate, DirectoryListResponse


class DirectoryService:
    def __init__(self, db: AsyncSession):
        self.repo = DirectoryRepository(db)

    async def create_directory(self, directory_in: DirectoryCreate) -> Directory:
        return await self.repo.create(Directory(**directory_in.model_dump()))

    async def update_directory(self, directory_id: int, directory_in: DirectoryUpdate) -> Directory:
        directory = await self.repo.db.get(Directory, directory_id)
        if not directory:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Директория не найдена")
        return await self.repo.update(directory, directory_in)

    async def delete_directory(self, directory_id: int) -> None:
        directory = await self.repo.db.get(Directory, directory_id)
        if not directory:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Директория не найдена")
        await self.repo.delete(directory)

    async def get_all_directories(self, page: int, limit: int) -> DirectoryListResponse:
        offset = (page - 1) * limit
        return await self.repo.list_directories(offset, limit)

    async def get_directory(self, directory_id: int) -> Directory:
        directory = await self.repo.db.get(Directory, directory_id)
        if not directory:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Директория не найдена")
        return directory

    async def get_by_id(self, directory_id: int) -> Directory:
        directory = await self.repo.get_by_id(directory_id)
        if not directory:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Директория не найдена")
        return directory