import asyncio
import json
import logging

import asyncpg

from app.core.config import settings
from app.me_note.note.connection_manager import manager

logger = logging.getLogger(__name__)

async def pg_notify_me_note_listener() -> None:
    """Переподключается при обрыве соединения, чтобы не терять уведомления молча."""
    while True:
        conn = None
        try:
            conn = await asyncpg.connect(settings.database_url.replace("+asyncpg", ""))

            async def callback(connection, pid, channel, payload):
                try:
                    data = json.loads(payload)
                    await manager.broadcast(data)
                except Exception as e:
                    logger.error(f"Ошибка обработки pg_notify me_note: {e}")

            await conn.add_listener("me_note_changed", callback)
            logger.info("me_note listener запущен")

            while not conn.is_closed():
                await asyncio.sleep(5)

            logger.warning("me_note listener: соединение закрыто, переподключаюсь")
        except Exception as e:
            logger.error(f"me_note listener упал: {e}, переподключаюсь через 5с")
        finally:
            if conn is not None and not conn.is_closed():
                await conn.close()

        await asyncio.sleep(5)