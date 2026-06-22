from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import AuthService
from app.db.database import get_db
from app.user.model import User

security = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    auth_service = AuthService(db)
    return await auth_service.get_current_user(credentials)

async def get_current_user_by_token(token: str, db: AsyncSession) -> User | None:
    from app.auth.jwt import AuthService
    try:
        auth_service = AuthService(db)
        from fastapi.security import HTTPAuthorizationCredentials
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        return await auth_service.get_current_user(credentials)
    except Exception:
        return None