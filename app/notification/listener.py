import asyncio
import json
import logging

import asyncpg

from app.core.config import settings
from app.db.database import async_session_maker
from app.notification.connection_manager import manager
from app.notification.repository import NotificationRepository

logger = logging.getLogger(__name__)


async def handle_new_notification(notification_id: int) -> None:
    """Обрабатывает новое уведомление: маппит emails → user_ids, создаёт recipients, пушит онлайн-юзерам."""
    async with async_session_maker() as db:
        repo = NotificationRepository(db)

        notification = await repo.get_notification_by_id(notification_id)
        if not notification:
            logger.warning(f"Notification {notification_id} не найдено")
            return

        # Парсим emails из строки "email1@k.kz;email2@k.kz"
        emails = [e.strip() for e in notification.recipients_email.split(";") if e.strip()]

        # Маппим emails → user_ids
        user_ids = await repo.get_user_ids_by_emails(emails)

        # Создаём записи в notification_recipient
        for user_id in user_ids:
            existing = await repo.get_recipient_by_notification_and_user(notification_id, user_id)
            if not existing:
                await repo.create_recipient(notification_id, user_id)

        # Пушим онлайн-юзерам
        unread_counts = {}
        for user_id in user_ids:
            if manager.is_online(user_id):
                if user_id not in unread_counts:
                    unread_counts[user_id] = await repo.get_unread_count(user_id)
                await manager.send_to_user(user_id, {
                    "notification_id": notification_id,
                    "title": notification.title,
                    "unread_count": unread_counts[user_id],
                })


async def pg_notify_listener() -> None:
    """Фоновая задача: слушает pg_notify и вызывает обработчик."""
    conn = await asyncpg.connect(settings.DATABASE_URL.replace("+asyncpg", ""))

    async def callback(connection, pid, channel, payload):
        try:
            data = json.loads(payload)
            notification_id = data["notification_id"]
            logger.info(f"pg_notify получен: notification_id={notification_id}")
            await handle_new_notification(notification_id)
        except Exception as e:
            logger.error(f"Ошибка обработки pg_notify: {e}")

    await conn.add_listener("new_notification", callback)
    logger.info("pg_notify listener запущен, слушаем канал 'new_notification'")

    try:
        while True:
            await asyncio.sleep(1)
    finally:
        await conn.remove_listener("new_notification", callback)
        await conn.close()