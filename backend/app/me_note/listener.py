import asyncio
import json
import logging

import asyncpg

from app.core.config import settings
from app.me_note.connection_manager import manager

logger = logging.getLogger(__name__)

async def pg_notify_me_note_listener() -> None:
    try:
        conn = await asyncpg.connect(settings.database_url.replace("+asyncpg", ""))
    except Exception as e:
        logger.error(f"asyncpg connect failed: {e}")
        return

    async def callback(connection, pid, channel, payload):
        try:
            data = json.loads(payload)
            await manager.broadcast(data)
        except Exception as e:
            logger.error(f"Ошибка обработки pg_notify me_note: {e}")

    await conn.add_listener("me_note_changed", callback)
    logger.info("me_note listener запущен")

    try:
        while True:
            await asyncio.sleep(1)
    finally:
        await conn.remove_listener("me_note_changed", callback)
        await conn.close()