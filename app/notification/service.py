from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.notification.model import Notification, NotificationRecipient
from app.notification.repository import NotificationRepository
from app.notification.schemas import NotificationRecipientResponse, UnreadCountResponse


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