from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.core.mixins import TimeStampMixin
from app.db.database import Base
from app.user.enums import UserRoles

if TYPE_CHECKING:
    from app.notification.model import NotificationRecipient
    from app.notification.model import Notification


class User(Base, TimeStampMixin):
    __tablename__ = "user"
    __table_args__ = {"schema": settings.POSTGRES_SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    first_name: Mapped[str] = mapped_column(String(64), nullable=True)
    last_name: Mapped[str] = mapped_column(String(64), nullable=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(256), nullable=False)
    role: Mapped[UserRoles] = mapped_column(
        Enum(UserRoles, schema=settings.POSTGRES_SCHEMA, name="userroles"),
        default=UserRoles.USER,
        nullable=False,
    )
    is_og: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, server_default="false"
    )

    notification_recipients: Mapped[list["NotificationRecipient"]] = relationship("NotificationRecipient", back_populates="user")

    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="responsible_user")
