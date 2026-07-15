from app.me_note.note.model import Tags
from app.me_note.tags.repository import TagsRepository


class TagService:
    def __init__(self, repo: TagsRepository):
        self.repo = repo

    async def get_or_create(self, names: list[str]) -> list[Tags]:
        if not names:
            return []
        existing = await self.repo.get_by_names(names)
        existing_names = {t.name for t in existing}
        missing = [n for n in names if n not in existing_names]
        new_tags = await self.repo.create_many(missing) if missing else []
        return existing + new_tags