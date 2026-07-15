import asyncio
import json
import logging

import asyncpg
from sqlalchemy import select

from app.core.config import settings
from app.db.database import AsyncSessionLocal as async_session_maker
from app.notification.connection_manager import manager
from app.notification.repository import NotificationRepository
from app.user.model import User

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
        emails = [e.strip().lower() for e in notification.recipients_email.split(";") if e.strip()]



        if "fcs@kcell.kz" in emails:
            res = await db.execute(select(User.email).where(User.is_og.is_(True)))
            emails.extend(res.scalars().all())
            print(emails)
            emails = list(set(emails))

        # Маппим emails → user_ids
        user_ids = await repo.get_user_ids_by_emails(emails)
        print(user_ids)

        # Создаём записи в notification_recipient
        await repo.bulk_create_recipients_if_not_exists(notification_id, user_ids)

        # Пушим онлайн-юзерам
        unread_counts = {}
        for user_id in user_ids:
            if manager.is_online(user_id):
                if user_id not in unread_counts:
                    unread_counts[user_id] = await repo.get_unread_count(user_id)
                await manager.send_to_user(user_id, {
                    "notification_id": notification_id,
                    "title": notification.title,
                    "sender": notification.sender,
                    "unread_count": unread_counts[user_id],
                })


async def pg_notify_listener() -> None:
    """Фоновая задача: слушает pg_notify и вызывает обработчик."""
    try:
        conn = await asyncpg.connect(settings.database_url.replace("+asyncpg", ""))
    except Exception as e:
        logger.error(f"asyncpg connect failed: {e}")
        return

    logger.info("asyncpg подключился успешно")

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