import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.control.model  # noqa: F401
import app.incident.model  # noqa: F401
import app.mfs.model  # noqa: F401
import app.task.model  # noqa: F401
import app.task.non_working_day  # noqa: F401
import app.user.model  # noqa: F401
import app.vacation_schedule.model  # noqa: F401
import app.notification.model  # noqa: F401
import app.me_note.note.model  # noqa: F401

from app.core.config import settings

test_engine = create_async_engine(settings.database_url, echo=False)
TestSessionLocal = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest_asyncio.fixture(loop_scope="session", scope="session")
async def db():
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()