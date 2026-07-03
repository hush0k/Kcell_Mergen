from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi import status as http_status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.user.model import User
from app.vacation_schedule.model import VacationSchedule
from app.vacation_schedule.schemas import (
    VacationScheduleCreate,
    VacationScheduleList,
    VacationScheduleRemainingList,
    VacationScheduleResponse,
    VacationScheduleUpdate,
)
from app.vacation_schedule.enums import VacationStatus, VacationType
from app.vacation_schedule.service import VacationScheduleService

router = APIRouter(prefix="/api/v1/vacation-schedule", tags=["Vacation schedule"])


def get_vacation_schedule_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VacationScheduleService:
    return VacationScheduleService(db)


ServiceDep = Annotated[VacationScheduleService, Depends(get_vacation_schedule_service)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/", response_model=VacationScheduleList)
async def get_all_vacation_schedule(
    service: ServiceDep,
    current_user: CurrentUser,
    page: int = 1,
    limit: int = 20,
    status: VacationStatus | None = None,
    vacation_type: VacationType | None = None,
    search: str | None = None,
) -> VacationScheduleList:
    return await service.get_all(
        current_user=current_user,
        page=page,
        limit=limit,
        status=status,
        vacation_type=vacation_type,
        search=search,
    )


@router.post(
    "/",
    response_model=VacationScheduleResponse,
    status_code=http_status.HTTP_201_CREATED,
)
async def create_vacation_schedule(
    service: ServiceDep,
    vacation_in: VacationScheduleCreate,
    current_user: CurrentUser,
) -> VacationSchedule:
    return await service.create(vacation_in, current_user)


@router.get(
    "/vacation-remaining-days", response_model=list[VacationScheduleRemainingList]
)
async def get_vacation_remaining_days(
    service: ServiceDep,
    current_user: CurrentUser,
) -> list[VacationScheduleRemainingList]:
    return await service.get_active_vacations_with_remaining_days(current_user)


@router.get("/{vacation_id}", response_model=VacationScheduleResponse)
async def get_vacation_schedule(
    service: ServiceDep,
    vacation_id: int,
    current_user: CurrentUser,
) -> VacationSchedule:
    return await service.get_by_id(vacation_id, current_user)


@router.patch("/{vacation_id}", response_model=VacationScheduleResponse)
async def update_vacation_schedule(
    service: ServiceDep,
    vacation_id: int,
    vacation_in: VacationScheduleUpdate,
    current_user: CurrentUser,
) -> VacationSchedule:
    return await service.update(vacation_id, vacation_in, current_user)


@router.delete("/{vacation_id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_vacation_schedule(
    service: ServiceDep,
    vacation_id: int,
    current_user: CurrentUser,
) -> None:
    await service.delete(vacation_id, current_user)

