from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

mfs_engine = create_async_engine(settings.MFS_DATABASE_URL, pool_pre_ping=True)
MfsSessionLocal = async_sessionmaker(
    mfs_engine, expire_on_commit=False, class_=AsyncSession
)


async def get_mfs_db() -> AsyncGenerator[AsyncSession]:
    async with MfsSessionLocal() as session:
        yield session


BlacklistDB = Annotated[AsyncSession, Depends(get_mfs_db)]
