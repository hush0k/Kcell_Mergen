from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import verify_password, hash_password
from app.user.enums import UserRoles
from app.user.model import User
from app.user.repository import UserRepository
from app.user.schemas import UserCreate, UserUpdate, UserUpdatePassword


class UserService:
    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)

    async def get_user_by_id(self, user_id: int) -> User:
        """
        Получает пользователя по id. Кидает 404 если не найден.
        :param user_id:
        :return:
        """
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
        return user

    async def get_user_by_username(self, username: str) -> User:
        """
        Получает пользователя по username. Кидает 404 если не найден.
        :param username:
        :return:
        """
        user = await self.repo.get_by_username(username)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
        return user

    async def get_all_users(self) -> list[User]:
        """
        Возвращает список всех пользователей.
        :return:
        """
        return await self.repo.get_all()

    async def create_user(self, user_in: UserCreate) -> User:
        """
        Создает нового пользователя. Проверяет что username не занят и хеширует пароль.
        :param user_in:
        :return:
        """
        user = await self.repo.get_by_username(user_in.username)
        if user:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Пользователь с таким username уже существует")

        user = User(
            **user_in.model_dump(exclude={"password"}),
            hashed_password=hash_password(user_in.password),
        )
        return await self.repo.create(user)

    async def update_user(self, user_id: int, user_in: UserUpdate) -> User:
        """
        Обновляет данные пользователя по id.
        :param user_id:
        :param user_in:
        :return:
        """
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
        return await self.repo.update(user, user_in)

    async def delete_user(self, user_id: int) -> None:
        """
        Удаляет пользователя по id.
        :param user_id:
        :return:
        """
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
        await self.repo.delete(user)

    async def change_password(self, user_id: int, passwords: UserUpdatePassword) -> None:
        """
        Меняет пароль пользователя после проверки старого пароля.
        :param user_id:
        :param passwords:
        :return:
        """
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
        if not verify_password(passwords.old_password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный старый пароль")
        user.hashed_password = hash_password(passwords.new_password)
        await self.repo.save_user(user)

    async def is_admin(self, user_id: int) -> bool:
        """
        Проверяет является ли пользователь администратором.
        :param user_id:
        :return:
        """
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
        return user.role == UserRoles.ADMIN