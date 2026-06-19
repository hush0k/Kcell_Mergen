from datetime import datetime
from os.path import exists

from fastapi import HTTPException, status as http_status
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.user.enums import UserRoles
from app.user.model import User
from app.user.repository import UserRepository
from app.vacation_schedule.enums import VacationStatus
from app.vacation_schedule.model import VacationSchedule
from app.vacation_schedule.schemas import VacationScheduleCreate, VacationScheduleUpdate, VacationScheduleRemainingList, \
    VacationScheduleResponse


class VacationScheduleService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def get_all(self, current_user: User, page: int, limit: int) -> list[VacationSchedule]:
        user = await self.user_repo.get_by_id(current_user.id)
        if not user or user.role != UserRoles.ADMIN:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Пользователь не найден или не является администратором")

        offset = (page - 1) * limit

        results = await self.db.execute(select(VacationSchedule).offset(offset).limit(limit))
        return list(results.scalars().unique().all())

    async def create(self, vac_in: VacationScheduleCreate, current_user: User) -> VacationSchedule:
        user = await self.user_repo.get_by_id(current_user.id)
        if not user or user.role != UserRoles.ADMIN:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Пользователь не найден или не является администратором")

        vacation = VacationSchedule(**vac_in.model_dump())
        self.db.add(vacation)
        await self.db.commit()
        return vacation

    async def update(self, vac_id: int, vac_in: VacationScheduleUpdate, current_user: User) -> VacationSchedule:
        user = await self.user_repo.get_by_id(current_user.id)
        if not user or user.role != UserRoles.ADMIN:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Пользователь не найден или не является администратором")

        vacation: VacationSchedule | None = await self.db.get(VacationSchedule, vac_id)
        if not vacation:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Отпуск не найдено")

        new_vacation = vac_in.model_dump(exclude_unset=True)
        for key, value in new_vacation.items():
            setattr(vacation, key, value)

        self.db.add(vacation)
        await self.db.commit()
        await self.db.refresh(vacation)
        return vacation

    async def delete(self, vac_id: int, current_user: User) -> None:
        user = await self.user_repo.get_by_id(current_user.id)
        if not user or user.role != UserRoles.ADMIN:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Пользователь не найден или не является администратором")

        vacation: VacationSchedule | None = await self.db.get(VacationSchedule, vac_id)
        if not vacation:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Отпуск не найдено")

        await self.db.delete(vacation)
        await self.db.commit()

    async def get_active_vacations_with_remaining_days(self,current_user: User) -> VacationScheduleRemainingList:
        user = await self.user_repo.get_by_id(current_user.id)
        if not user or user.role != UserRoles.ADMIN:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Пользователь не найден или не является администратором")
        results = await self.db.execute(
            select(VacationSchedule)
            .where(VacationSchedule.status == VacationStatus.ACTIVE)
        )
        vacations_list = results.scalars().unique().all()

        return VacationScheduleRemainingList(
            vacations=[VacationScheduleResponse.model_validate(v) for v in vacations_list],
            days=len(vacations_list)
        )

    async def _check_for_vacation(self, user_id: int) -> bool:
        return bool(await self.db.scalar(
            select(
                exists().where(
                    and_(
                        VacationSchedule.user_id == user_id,
                        VacationSchedule.status == VacationStatus.ACTIVE,
                        VacationSchedule.start_date <= func.current_date(),
                        VacationSchedule.end_date >= func.current_date(),
                        )
                )
            )
        ))







