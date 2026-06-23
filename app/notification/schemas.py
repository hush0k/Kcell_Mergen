from datetime import datetime

from pydantic import BaseModel

from app.notification.enums import NotificationTypes
from app.user.schemas import UserResponse


class NotificationResponse(BaseModel):
    id: int
    notification_type: NotificationTypes
    responsible_user_id: int
    sender: str
    title: str | None
    html_content: str
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationRecipientResponse(BaseModel):
    id: int
    notification_id: int
    recipient_id: int
    is_read: bool
    read_at: datetime | None
    notification: NotificationResponse

    model_config = {"from_attributes": True}


class NotificationReadResponse(BaseModel):
    id: int
    is_read: bool
    read_at: datetime

    model_config = {"from_attributes": True}


class UnreadCountResponse(BaseModel):
    unread_count: int