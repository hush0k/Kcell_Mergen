from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.me_note.model import Directory
from app.me_note.directory_schemas import DirectoryResponse, DirectoryCreate, DirectoryUpdate, DirectoryListResponse, \
    DirectoryWithFilesResponse
from app.me_note.directory_service import  DirectoryService
from app.user.model import User

router = APIRouter(prefix="/api/v1/directory", tags=["Directory"])


def get_directory_service(db: Annotated[AsyncSession, Depends(get_db)]) -> DirectoryService:
    return DirectoryService(db)


ServiceDep = Annotated[DirectoryService, Depends(get_directory_service)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("/", response_model=DirectoryResponse, status_code=status.HTTP_201_CREATED)
async def create_directory(service: ServiceDep, directory_in: DirectoryCreate, _: CurrentUser) -> Directory:
    return await service.create_directory(directory_in)

@router.patch("/{directory_id}", response_model=DirectoryResponse)
async def update_directory(service: ServiceDep, directory_id: int, directory_in: DirectoryUpdate, _: CurrentUser) -> Directory:
    return await service.update_directory(directory_id, directory_in)

@router.delete("/{directory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_directory(service: ServiceDep, directory_id: int, _: CurrentUser) -> None:
    await service.delete_directory(directory_id)

@router.get("/", response_model=DirectoryListResponse)
async def list_directories(service: ServiceDep, _: CurrentUser, page: int = 1, per_page: int = 20) -> DirectoryListResponse:
    return await service.get_all_directories(page, per_page)

@router.get("/{directory_id}", response_model=DirectoryResponse)
async def get_directory(service: ServiceDep, directory_id: int, _: CurrentUser) -> Directory:
    return await service.get_directory(directory_id)

@router.get("/{directory_id}/with-files", response_model=DirectoryWithFilesResponse)
async def get_directory(service: ServiceDep, directory_id: int, _: CurrentUser) -> Directory:
    return await service.get_by_id(directory_id)