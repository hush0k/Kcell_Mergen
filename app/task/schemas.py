from datetime import date, datetime
from typing import Annotated

from pydantic import BaseModel, Field

from app.task.enums import TaskStatus


# Переиспользуемые типы
TaskId = Annotated[int, Field(gt=0)]
UserId = Annotated[int, Field(gt=0)]
ControlId = Annotated[int, Field(gt=0)]


class TaskCreate(BaseModel):
    control_id: ControlId
    user_id: UserId | None = None
    date: Annotated[date, Field(description="Дата задачи")]
    status: TaskStatus = TaskStatus.NOT_STARTED


class TaskUpdate(BaseModel):
    status: TaskStatus | None = None
    comments: Annotated[str | None, Field(max_length=2000)] = None


class TaskAssignee(BaseModel):
    id: UserId
    username: Annotated[str, Field(min_length=1, max_length=64)]


class TaskControl(BaseModel):
    id: ControlId
    name: Annotated[str, Field(min_length=1, max_length=256)]
    area: Annotated[str | None, Field(max_length=128)] = None
    frequency: Annotated[str, Field(min_length=1, max_length=64)]
    priority: Annotated[str | None, Field(max_length=32)] = None
    risk: Annotated[str | None, Field(max_length=256)] = None
    dashboard_url: Annotated[str | None, Field(max_length=512)] = None
    deadline_at: date | None = None
    responsible: TaskAssignee | None = None


class TaskDetail(BaseModel):
    id: TaskId
    date: date
    created_at: datetime | None = None
    status: TaskStatus
    start_time: datetime | None = None
    end_time: datetime | None = None
    comments: Annotated[str | None, Field(max_length=2000)] = None
    incident_ids: Annotated[list[TaskId], Field(default_factory=list)]
    weekend_group_id: Annotated[int | None, Field(gt=0)] = None
    weekend_related_tasks: Annotated[list[dict], Field(default_factory=list)]
    control: TaskControl
    assignee: TaskAssignee | None = None

    model_config = {"from_attributes": True}