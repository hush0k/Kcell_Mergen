from datetime import datetime

from bs4 import BeautifulSoup
from pydantic import BaseModel, computed_field

from app.notification.enums import NotificationTypes
from app.user.schemas import UserBrief


class NotificationResponse(BaseModel):
    id: int
    notification_type: NotificationTypes
    responsible_user_id: int | None
    responsible_user: UserBrief | None
    sender: str
    title: str | None
    html_content: str
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def preview(self) -> str:
        text = BeautifulSoup(self.html_content, "html.parser").get_text(separator=" ", strip=True)
        return text[:120] + ("…" if len(text) > 120 else "")

class NotificationCreate(BaseModel):
    notification_type: NotificationTypes = NotificationTypes.TASK_CREATED
    sender: str
    title: str | None
    html_content: str
    error_message: str | None
    recipients_email: str | None


class NotificationRecipientResponse(BaseModel):
    id: int
    notification_id: int
    recipient_id: int
    is_read: bool
    read_at: datetime | None
    notification: NotificationResponse
    user: UserBrief

    model_config = {"from_attributes": True}

class NotificationsList(BaseModel):
    notifications: list[NotificationRecipientResponse]
    offset: int
    limit: int
    total: int

    model_config = {"from_attributes": True}


class NotificationReadResponse(BaseModel):
    id: int
    is_read: bool
    read_at: datetime

    model_config = {"from_attributes": True}


class UnreadCountResponse(BaseModel):
    unread_count: int