from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import AuthService
from app.auth.schemas import LoginRequest, RefreshRequest, Token
from app.db.database import get_db

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])
security = HTTPBearer()


def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(db)


@router.post("/login", response_model=Token)
async def login(
        data: LoginRequest,
        auth_service: AuthService = Depends(get_auth_service),
) -> Token:
    user = await auth_service.authenticate_user(data.username, data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    return Token(
        access_token=auth_service.create_access_token(user.id),
        refresh_token=auth_service.create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=Token)
async def refresh(
        data: RefreshRequest,
        auth_service: AuthService = Depends(get_auth_service),
) -> Token:
    new_access_token = await auth_service.refresh_access_token(data.refresh_token)
    return Token(
        access_token=new_access_token,
        refresh_token=data.refresh_token,
    )


@router.get("/me")
async def get_me(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        auth_service: AuthService = Depends(get_auth_service),
):
    user = await auth_service.get_current_user(credentials)
    return {"id": user.id, "username": user.username, "role": user.role}