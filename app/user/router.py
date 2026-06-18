from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.user.model import User
from app.user.schemas import UserCreate, UserResponse, UserUpdate, UserUpdatePassword
from app.user.service import UserService

router = APIRouter(prefix="/api/v1/user", tags=["User"])


def get_user_service(db: Annotated[AsyncSession, Depends(get_db)]) -> UserService:
    return UserService(db)


ServiceDep = Annotated[UserService, Depends(get_user_service)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/", response_model=list[UserResponse])
async def get_all_users(
    service: ServiceDep,
    page: int = 1,
    limit: int = 20,
) -> list[User]:
    return await service.get_all_users(page, limit)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(service: ServiceDep, user_id: int) -> User:
    return await service.get_user_by_id(user_id)


@router.get("/by_username/{username}", response_model=UserResponse)
async def get_user_by_username(service: ServiceDep, username: str) -> User:
    return await service.get_user_by_username(username)


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    service: ServiceDep, user_in: UserCreate, current_user: CurrentUser
) -> User:
    if not await service.is_admin(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Для совершение операции требуется права администратора",
        )
    return await service.create_user(user_in)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    service: ServiceDep, user_id: int, user_in: UserUpdate, current_user: CurrentUser
) -> User:
    if not await service.is_admin(current_user.id) and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Для совершение операции не достаточно прав",
        )
    return await service.update_user(user_id, user_in)


@router.patch("/{user_id}/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    service: ServiceDep,
    user_id: int,
    passwords: UserUpdatePassword,
    current_user: CurrentUser,
) -> None:
    if not await service.is_admin(current_user.id) and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Для совершение операции не достаточно прав",
        )
    await service.change_password(user_id, passwords)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    service: ServiceDep, user_id: int, current_user: CurrentUser
) -> None:
    if not await service.is_admin(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Для совершение операции требуется права администратора",
        )
    await service.delete_user(user_id)
