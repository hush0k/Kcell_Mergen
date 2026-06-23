from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.notification.connection_manager import manager
from app.notification.model import Notification, NotificationRecipient
from app.notification.repository import NotificationRepository
from app.notification.schemas import NotificationRecipientResponse, UnreadCountResponse, NotificationCreate


class NotificationService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = NotificationRepository(db)

    async def get_user_notifications(
            self, user_id: int, page: int, limit: int
    ) -> list[NotificationRecipient]:
        offset = (page - 1) * limit
        return await self.repo.get_user_notifications(user_id, offset, limit)

    async def get_unread_count(self, user_id: int) -> UnreadCountResponse:
        count = await self.repo.get_unread_count(user_id)
        return UnreadCountResponse(unread_count=count)

    async def get_notification_html(
            self, notification_id: int, user_id: int
    ) -> Notification:
        recipient = await self.repo.get_recipient_by_notification_and_user(
            notification_id, user_id
        )
        if not recipient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Уведомление не найдено")

        return recipient.notification

    async def mark_as_read(
            self, notification_id: int, user_id: int
    ) -> NotificationRecipient:
        recipient = await self.repo.get_recipient_by_notification_and_user(
            notification_id, user_id
        )
        if not recipient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Уведомление не найдено")
        if recipient.is_read:
            return recipient

        return await self.repo.mark_as_read(recipient)

    async def become_responsible_user(self, notification_id: int, user_id: int) -> Notification:
        notification = await self.repo.get_notification_by_id(notification_id)
        if not notification:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Уведомление не найдено")

        if notification.responsible_user_id is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Задача уже выбран другим пользователем")

        is_recipient = await self.repo.is_user_recipient(notification_id, user_id)
        if not is_recipient:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Не достаточно прав для совершение операции")

        notification = await self.repo.become_responsible_user(notification, user_id)

        recipient_ids = await self.repo.get_recipients_ids(notification_id)

        for rid in recipient_ids:
            if manager.is_online(rid):
                await manager.send_to_user(rid, {
                    "type": "User take task",
                    "notification_id": notification_id,
                    "user_id": user_id,
                })

        return notification

    async def create_notification(self, not_in: NotificationCreate) -> Notification:
        return await self.repo.create(not_in)