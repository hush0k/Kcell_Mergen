import re
from datetime import datetime

from bs4 import BeautifulSoup
from pydantic import BaseModel, computed_field

from app.notification.enums import NotificationTypes
from app.user.schemas import UserBrief

NOTE_LINK_RE = re.compile(r"/me-notes/(\d+)")
INCIDENT_LINK_RE = re.compile(r"/incidents/(\d+)")


class NotificationResponse(BaseModel):
    id: int
    responsible_user_id: int | None
    responsible_user: UserBrief | None
    sender: str
    title: str | None
    html_content: str
    error_message: str | None
    created_at: datetime
    start_time: datetime | None
    end_time: datetime | None

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def preview(self) -> str:
        text = BeautifulSoup(self.html_content, "html.parser").get_text(separator=" ", strip=True)
        return text[:120] + ("…" if len(text) > 120 else "")

    @computed_field
    @property
    def is_system_request(self) -> bool:
        return bool(self.title) and "CODE:843" in self.title

    @computed_field
    @property
    def request_note_id(self) -> int | None:
        match = NOTE_LINK_RE.search(self.html_content)
        return int(match.group(1)) if match else None

    @computed_field
    @property
    def request_edit_mode(self) -> bool:
        return bool(self.title) and "редактирование" in self.title

    @computed_field
    @property
    def is_incident_approval(self) -> bool:
        return bool(self.title) and "CODE:INC" in self.title

    @computed_field
    @property
    def incident_id(self) -> int | None:
        match = INCIDENT_LINK_RE.search(self.html_content)
        return int(match.group(1)) if match else None

    requester_user_id: int | None = None
    access_granted: bool = False
    incident_status: str | None = None

class NotificationCreate(BaseModel):
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


class ErrorNotificationCreate(BaseModel):
    id: int
    title: str
    dashboard_url: str
