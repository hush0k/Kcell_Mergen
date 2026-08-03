from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.user.enums import UserRoles
from app.user.model import User
from app.user.schemas import UserUpdate


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: int) -> User | None:
        """
        Получает пользователя по его id через первичный ключ.
        """
        return await self.db.get(User, user_id)

    async def get_by_username(self, username: str) -> User | None:
        """
        Получает пользователя по его username.
        """
        result = await self.db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        """
        Получает пользователя по его email.
        """
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_all(self, offset: int = 0, limit: int = 20) -> list[User]:
        """
        Возвращает список всех пользователей с пагинацией.
        В сервисах считаются страницы через offset = (page - 1) * limit.
        """
        result = await self.db.execute(select(User).offset(offset).limit(limit))
        return list(result.scalars().all())

    async def create(self, user: User) -> User:
        """
        Создает нового пользователя. Пароль хешируется перед сохранением в БД. Без проверки.
        """
        self.db.add(user)
        return await self.save_user(user)

    async def update(self, user: User, user_in: UserUpdate) -> User:
        """
        Обновляет поля пользователя. Обновляются только те поля которые были переданы (exclude_unset).
        """
        updated_user = user_in.model_dump(exclude_unset=True)
        for key, value in updated_user.items():
            setattr(user, key, value)
        return await self.save_user(user)

    async def delete(self, user: User) -> None:
        """
        Удаляет пользователя из БД.
        """
        await self.db.delete(user)
        await self.db.commit()

    async def save_user(self, user: User) -> User:
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def get_admin_emails(self) -> list[str]:
        ids = await self.db.execute(
            select(User.email).where(User.role == UserRoles.ADMIN)
        )
        return list(ids.scalars().all())

    async def get_admins(self) -> list[User]:
        result = await self.db.execute(select(User).where(User.role == UserRoles.ADMIN))
        return list(result.scalars().all())
