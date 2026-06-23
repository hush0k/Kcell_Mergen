from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Integer, Enum, String, ForeignKey, Boolean, DateTime, Text
from sqlalchemy.orm import mapped_column, Mapped, relationship

from app.core.config import settings
from app.core.mixins import TimeStampMixin
from app.db.database import Base
from app.notification.enums import NotificationTypes

if TYPE_CHECKING:
    from app.user.model import User


class Notification(Base, TimeStampMixin):
    __tablename__ = "notification"
    __table_args__ = {"schema": settings.POSTGRES_SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    notification_type: Mapped[NotificationTypes] = mapped_column(
        Enum(
            NotificationTypes,
            schema=settings.POSTGRES_SCHEMA,
            name="notificationtypes",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
    )
    recipients_email: Mapped[str] = mapped_column(String(4000), nullable=False)
    responsible_user_id: Mapped[int] = mapped_column(ForeignKey(f"{settings.POSTGRES_SCHEMA}.user.id", ondelete="SET NULL"), nullable=True)
    sender: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    html_content: Mapped[str] = mapped_column(nullable=False)
    error_message: Mapped[str | None] = mapped_column(nullable=True)

    recipients: Mapped[list["NotificationRecipient"]] = relationship(
        "NotificationRecipient", back_populates="notification"
    )

    # Relationships
    responsible_user: Mapped["User | None"] = relationship("User", back_populates="notifications")


class NotificationRecipient(Base):
    __tablename__ = "notification_recipient"
    __table_args__ = {"schema": settings.POSTGRES_SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    notification_id: Mapped[int] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.notification.id", ondelete="CASCADE"),
        nullable=False,
    )
    recipient_id: Mapped[int] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.user.id", ondelete="CASCADE"),
        nullable=False,
    )
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    notification: Mapped["Notification"] = relationship(
        "Notification", back_populates="recipients"
    )
    user: Mapped["User"] = relationship("User", back_populates="notification_recipients")