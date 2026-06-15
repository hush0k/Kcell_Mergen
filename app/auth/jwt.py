from datetime import datetime, timedelta, UTC
from typing import Optional

from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from jose import JWTError, jwt
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
        expire = datetime.now(UTC) + timedelta(
            minutes=settings.access_token_expire_minutes
        )
        payload = TokenPayload(
            sub=str(user_id), exp=int(expire.timestamp()), type="access"
        )
        return jwt.encode(
            payload.model_dump(), settings.jwt_secret_key, algorithm=settings.jwt_algorithm
        )

    def create_refresh_token(self, user_id: int) -> str:
        expire = datetime.now(UTC) + timedelta(minutes=settings.refresh_token_expire_minutes)
        payload = TokenPayload(
            sub=str(user_id), exp=int(expire.timestamp()), type="refresh"
        )
        return jwt.encode(
            payload.model_dump(), settings.jwt_secret_key, algorithm=settings.jwt_algorithm
        )

    def verify_token(self, token: str, token_type: str) -> Optional[TokenPayload]:
        try:
            payload = jwt.decode(
                token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
            )
            token_data = TokenPayload(**payload)

            if token_data.type != token_type:
                return None

            return token_data
        except JWTError as e:
            return None


    async def authenticate_user(self, username: str, password: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()

        if not user:
            return None

        if not verify_password(password, user.hashed_password):
            return None

        return user

    async def get_current_user(self, credentials: HTTPAuthorizationCredentials) -> User:
        token = credentials.credentials

        token_data = self.verify_token(token, "access")
        if not token_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        result = await self.db.execute(
            select(User)
            .where(User.id == int(token_data.sub))
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        return user

    async def refresh_access_token(self, refresh_token: str) -> str:
        token_data = self.verify_token(refresh_token, "refresh")
        if not token_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        return self.create_access_token(int(token_data.sub))


