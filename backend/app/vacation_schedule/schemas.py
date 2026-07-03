from datetime import date, datetime
from typing import Annotated

from pydantic import BaseModel, Field

from app.user.schemas import UserBrief
from app.vacation_schedule.enums import VacationStatus, VacationType

UserId = Annotated[int, Field(gt=0)]


class VacationScheduleBase(BaseModel):
    user_id: UserId
    start_date: date
    end_date: date
    vacation_type: VacationType = VacationType.ANNUAL_LEAVE
    status: VacationStatus = VacationStatus.ACTIVE


class VacationScheduleCreate(VacationScheduleBase):
    pass


class VacationScheduleUpdate(BaseModel):
    user_id: UserId | None = None
    start_date: date | None = None
    end_date: date | None = None
    vacation_type: VacationType | None = None
    status: VacationStatus | None = None


class VacationScheduleResponse(VacationScheduleBase):
    id: int
    user_id: UserId
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VacationScheduleWithUser(VacationScheduleResponse):
    user: UserBrief | None = None


class VacationScheduleList(BaseModel):
    vacations: list[VacationScheduleWithUser]
    offset: int
    limit: int
    total: int


class VacationScheduleRemainingList(BaseModel):
    vacation: VacationScheduleResponse
    days: int


# class VacationScheduleFilter(BaseModel):
#     start_date: date | None = None
#     end_date: date | None = None
#     vacation_type: VacationType | None = None
#     status: VacationStatus | None = None
#
# class VacationScheduleSort(BaseModel):
#     user_id: UserId | None
#     start_date: date | None = None
#     end_date: date | None = None
#     vacation_type: VacationType | None = None
#     status: VacationStatus | None = None
#     created_at: date | None = None
#     updated_at: date | None = None
