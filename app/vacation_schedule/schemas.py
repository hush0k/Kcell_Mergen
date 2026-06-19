from typing import Annotated
from datetime import date, datetime

from pydantic import BaseModel, Field

from app.vacation_schedule.enums import VacationType, VacationStatus

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
    user_id: UserId
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

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




