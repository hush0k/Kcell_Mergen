from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.me_note.note.model import Tags


class TagsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_many(self, names: list[str]) -> list[Tags]:
        tags = [Tags(name=name) for name in names]
        self.db.add_all(tags)
        await self.db.flush()
        return tags

    async def get_by_names(self, names: list[str]) -> list[Tags]:
        result = await self.db.execute(select(Tags).where(Tags.name.in_(names)))
        return list(result.scalars().all())