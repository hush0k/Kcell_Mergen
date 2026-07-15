import asyncio
import logging

from app.db.database import AsyncSessionLocal
from app.me_note.note.repository import MeNoteRepository

logger = logging.getLogger(__name__)

SWEEP_INTERVAL_SECONDS = 60


async def me_note_ttl_sweeper() -> None:
    while True:
        try:
            async with AsyncSessionLocal() as session:
                released = await MeNoteRepository(session).release_expired_locks()
                if released:
                    logger.info(f"me_note TTL sweep: снято блокировок {released}")
        except Exception as e:
            logger.error(f"me_note TTL sweep error: {e}")

        await asyncio.sleep(SWEEP_INTERVAL_SECONDS)
