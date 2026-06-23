from datetime import UTC, datetime, timedelta

import jwt
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from jwt import InvalidTokenError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.schemas import TokenPayload
from app.auth.security import verify_password
from app.core.config import settings
from app.user.model import User


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def create_access_token(self, user_id: int) -> str:
        """
        Создает JWT access токен для пользователя с заданным user_id с временем жизни 30 минут
        :param user_id:
        :return:
        """

        expire = datetime.now(UTC) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        payload = TokenPayload(
            sub=str(user_id), exp=int(expire.timestamp()), type="access"
        )
        return jwt.encode(
            payload.model_dump(),
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )

    def create_refresh_token(self, user_id: int) -> str:
        """
        Создание JWT refresh токена для пользователя с заданным user_id, который будет действовать в течение 100 лет
        :param user_id:
        :return:
        """

        expire = datetime.now(UTC) + timedelta(
            minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES  # 100 лет в минутах
        )
        payload = TokenPayload(
            sub=str(user_id), exp=int(expire.timestamp()), type="refresh"
        )
        return jwt.encode(
            payload.model_dump(),
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )

    def verify_token(self, token: str, token_type: str) -> TokenPayload | None:
        """
        Обычная проверка токена на правильность и срок действия. Также проверяет, что тип токена соответствует ожидаемому (access или refresh)
        :param token:
        :param token_type:
        :return:
        """

        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
            )
            token_data = TokenPayload(**payload)

            if token_data.type != token_type:
                return None

            return token_data
        except InvalidTokenError:
            return None

    async def authenticate_user(self, username: str, password: str) -> User | None:
        """
        Функция для проверки правильности введенных пользователем данных при логине. Ищет пользователя по имени и проверяет пароль
        :param username:
        :param password:
        :return:
        """

        result = await self.db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()

        if not user:
            return None

        if not verify_password(password, user.hashed_password):
            return None

        return user

    async def get_current_user(self, credentials: HTTPAuthorizationCredentials) -> User:
        """
        С помощью access token берет данные юзера и возвращает его из базы. Если токен невалидный или юзер не найден, выбрасывает исключение
        :param credentials:
        :return:
        """

        token = credentials.credentials

        token_data = self.verify_token(token, "access")
        if not token_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        result = await self.db.execute(
            select(User).where(User.id == int(token_data.sub))
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        return user

    async def refresh_access_token(self, refresh_token: str) -> str:
        """
        Для обновления access token по refresh token. Проверяет валидность refresh token и, если он действителен, создает новый access token для того же пользователя
        :param refresh_token:
        :return:
        """

        token_data = self.verify_token(refresh_token, "refresh")
        if not token_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
            )
        return self.create_access_token(int(token_data.sub))
