import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

test_engine = create_async_engine(settings.database_url, echo=False)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(loop_scope="session", scope="session")
async def db():
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()