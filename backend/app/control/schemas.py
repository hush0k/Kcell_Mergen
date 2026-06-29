from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field

from app.control.enums import ControlStatus, Frequency

# Переиспользуемые типы
Area = Annotated[str, Field(min_length=1, max_length=64)]
Name = Annotated[str, Field(min_length=1, max_length=128)]
Risk = Annotated[str, Field(max_length=64)]
Priority = Annotated[str, Field(max_length=64)]
DashboardUrl = Annotated[str, Field(max_length=512)]


class ControlCreate(BaseModel):
    area: Area
    name: Name
    description: str | None = None
    time_estimate: int | None = None
    frequency: Frequency = Frequency.DAILY
    responsible_id: int | None = None
    backup_id: int | None = None
    risk: Risk = "0"
    priority: Priority = "0"
    dashboard_url: DashboardUrl | None = None
    status: ControlStatus = ControlStatus.ACTIVE


class ControlUpdate(BaseModel):
    area: Area | None = None
    name: Name | None = None
    description: str | None = None
    time_estimate: int | None = None
    frequency: Frequency | None = None
    responsible_id: int | None = None
    original_user_id: int | None = None
    backup_id: int | None = None
    risk: Risk | None = None
    priority: Priority | None = None
    dashboard_url: DashboardUrl | None = None
    status: ControlStatus | None = None


class ControlResponse(BaseModel):
    id: int
    area: str
    name: str
    description: str | None
    time_estimate: int | None
    frequency: Frequency
    responsible_id: int | None
    backup_id: int | None
    original_user_id: int | None
    risk: str
    priority: str
    dashboard_url: str | None
    status: ControlStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ControlBrief(BaseModel):
    id: int
    name: Name
    area: Area
    dashboard_url: str | None
    frequency: Frequency
    responsible_id: int | None
    backup_id: int | None
    time_estimate: int | None

    model_config = {"from_attributes": True}
