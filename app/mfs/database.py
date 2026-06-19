from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import settings

mfs_engine = create_async_engine(settings.MFS_DATABASE_URL, pool_pre_ping=True)
MfsSessionLocal = async_sessionmaker(mfs_engine, expire_on_commit=False, class_=AsyncSession)

async def get_mfs_db():
    async with MfsSessionLocal() as session:
        yield session

