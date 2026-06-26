from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field

from app.control.schemas import ControlBrief
from app.task.enums import TaskStatus
from app.user.schemas import UserBrief

# Переиспользуемые типы
TaskId = Annotated[int, Field(gt=0)]
UserId = Annotated[int, Field(gt=0)]
ControlId = Annotated[int, Field(gt=0)]
TaskName = Annotated[str, Field(min_length=1, max_length=256)]


class TaskBase(BaseModel):
    user_id: UserId | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    comments: Annotated[str | None, Field(min_length=1, max_length=2000)] = None
    status: TaskStatus = TaskStatus.NOT_STARTED
    weekend_group_id: int | None = None


class TaskCreate(TaskBase):
    control_id: ControlId


class TaskUpdate(BaseModel):
    user_id: UserId | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    comments: Annotated[str | None, Field(min_length=1, max_length=2000)] = None
    status: TaskStatus | None = None
    weekend_group_id: int | None = None


class TaskResponse(TaskBase):
    id: TaskId
    deadline_time: datetime
    control_id: ControlId
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class TaskList(BaseModel):
    task_list: list[TaskResponse]
    offset: int
    limit: int
    total: int

    model_config = {"from_attributes": True}

class TaskWithControlResponse(TaskResponse):
    control: ControlBrief
    user: UserBrief | None = None

class TaskListWithControls(BaseModel):
    task_list: list[TaskWithControlResponse]
    offset: int
    limit: int
    total: int

    model_config = {"from_attributes": True}
