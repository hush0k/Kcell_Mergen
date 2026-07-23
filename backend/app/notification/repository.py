from datetime import datetime, timezone

from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.notification.model import Notification, NotificationRecipient
from app.notification.schemas import NotificationCreate
from app.user.model import User


class NotificationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_recipient_by_notification_and_user(
            self, notification_id: int, user_id: int
    ) -> NotificationRecipient | None:
        result = await self.db.execute(
            select(NotificationRecipient)
            .options(
                joinedload(NotificationRecipient.notification).joinedload(Notification.responsible_user),
                joinedload(NotificationRecipient.user),
            )
            .where(
                NotificationRecipient.notification_id == notification_id,
                NotificationRecipient.recipient_id == user_id,
                )
        )
        return result.scalar_one_or_none()

    async def get_user_notifications(
            self,
            user_id: int,
            offset: int,
            limit: int,
            is_read: bool | None = None,
    ) -> list[NotificationRecipient]:
        query = (
            select(NotificationRecipient)
            .where(NotificationRecipient.recipient_id == user_id)
            .options(
                joinedload(NotificationRecipient.notification).joinedload(Notification.responsible_user),
                joinedload(NotificationRecipient.user),
            )
        )
        if is_read is not None:
            query = query.where(NotificationRecipient.is_read.is_(is_read))

        result = await self.db.execute(
            query.order_by(NotificationRecipient.id.desc()).offset(offset).limit(limit)
        )
        return list(result.scalars().unique().all())

    async def get_user_notifications_count(
            self,
            user_id: int,
            is_read: bool | None = None,
    ) -> int:
        query = select(func.count()).where(NotificationRecipient.recipient_id == user_id)
        if is_read is not None:
            query = query.where(NotificationRecipient.is_read.is_(is_read))

        result = await self.db.execute(query)
        return result.scalar_one()

    async def get_unread_count(self, user_id: int) -> int:
        result = await self.db.execute(
            select(func.count()).where(
                NotificationRecipient.recipient_id == user_id,
                NotificationRecipient.is_read.is_(False),
                )
        )
        return result.scalar_one()

    async def get_notification_by_id(self, notification_id: int) -> Notification | None:
        result = await self.db.execute(
            select(Notification).where(Notification.id == notification_id)
        )
        return result.scalar_one_or_none()

    async def mark_as_read(self, recipient: NotificationRecipient) -> NotificationRecipient:
        from datetime import datetime, timezone
        recipient.is_read = True
        recipient.read_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(recipient)
        return recipient

    async def create_recipient(
            self, notification_id: int, user_id: int
    ) -> NotificationRecipient:
        recipient = NotificationRecipient(
            notification_id=notification_id,
            recipient_id=user_id,
        )
        self.db.add(recipient)
        await self.db.commit()
        await self.db.refresh(recipient)
        return recipient

    async def get_user_ids_by_emails(self, emails: list[str]) -> list[int]:
        from app.user.model import User
        result = await self.db.execute(
            select(User.id).where(User.email.in_(emails))
        )
        return list(result.scalars().all())

    async def bulk_create_recipients_if_not_exists(
            self, notification_id: int, user_ids: list[int]
    ) -> None:
        if not user_ids:
            return
        for user_id in user_ids:
            await self.db.execute(
                text("""
                     INSERT INTO kcell_web.notification_recipient (notification_id, recipient_id, is_read)
                     VALUES (:notification_id, :user_id, false)
                         ON CONFLICT (notification_id, recipient_id) DO NOTHING
                     """),
                {"notification_id": notification_id, "user_id": user_id}
            )
        await self.db.commit()

    async def become_responsible_user(self, notification: Notification, user_id: int) -> Notification:
        notification.responsible_user_id = user_id
        notification.start_time = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    async def end_notification_task(self, notification: Notification) -> Notification:
        notification.end_time = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    async def is_user_recipient(self, notification_id: int, user_id: int) -> bool:
        result = await self.db.execute(
            select(User)
            .join(NotificationRecipient, NotificationRecipient.recipient_id == User.id)
            .where(
                NotificationRecipient.notification_id == notification_id,
                User.id == user_id
            )
        )
        return result.scalar_one_or_none() is not None

    async def get_recipients_ids(self, notification_id: int) -> list[int]:
        result = await self.db.execute(
            select(NotificationRecipient.recipient_id)
            .where(NotificationRecipient.notification_id == notification_id)
        )
        return list(result.scalars().all())


    async def create(self, notification_in: NotificationCreate) -> Notification:
        new_notification = Notification(**notification_in.model_dump())

        self.db.add(new_notification)
        await self.db.commit()
        await self.db.refresh(new_notification)

        if notification_in.recipients_email:
            emails = [
                email.strip()
                for email in notification_in.recipients_email.replace(";", ",").split(",")
                if email.strip()
            ]
            user_ids = await self.get_user_ids_by_emails(emails)
            await self.bulk_create_recipients_if_not_exists(new_notification.id, user_ids)

        return new_notification