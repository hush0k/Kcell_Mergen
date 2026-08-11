from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.me_note.attachments.schemas import AttachmentsCreate
from app.me_note.note.model import AttachedFiles


class AttachmentsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: AttachmentsCreate) -> AttachedFiles:
        attachment = AttachedFiles(**data.model_dump())
        self.db.add(attachment)
        await self.db.commit()
        await self.db.refresh(attachment)
        return attachment

    async def get_by_id(self, attachment_id: int) -> AttachedFiles | None:
        return await self.db.get(AttachedFiles, attachment_id)

    async def list_by_note(self, note_id: int) -> list[AttachedFiles]:
        result = await self.db.execute(
            select(AttachedFiles)
            .where(AttachedFiles.note_id == note_id)
            .order_by(AttachedFiles.created_at.desc())
        )
        return list(result.scalars().all())

    async def delete(self, attachment: AttachedFiles) -> None:
        await self.db.delete(attachment)
        await self.db.commit()
