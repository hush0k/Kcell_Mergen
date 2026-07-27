from datetime import date

from fastapi import HTTPException
from fastapi import status as http_status
from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.user.enums import UserRoles
from app.user.model import User
from app.user.repository import UserRepository
from app.vacation_schedule.enums import VacationStatus, VacationType
from app.vacation_schedule.model import VacationSchedule
from app.vacation_schedule.schemas import (
    VacationScheduleCreate,
    VacationScheduleList,
    VacationScheduleRemainingList,
    VacationScheduleResponse,
    VacationScheduleUpdate,
)


class VacationScheduleService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def get_all(
        self,
        current_user: User,
        page: int,
        limit: int,
        status: VacationStatus | None = None,
        vacation_type: VacationType | None = None,
        search: str | None = None,
    ) -> VacationScheduleList:
        user = await self.user_repo.get_by_id(current_user.id)
        if not user or user.role != UserRoles.ADMIN:
            pass

        offset = (page - 1) * limit
        filters = []
        if status:
            filters.append(VacationSchedule.status == status)
        if vacation_type:
            filters.append(VacationSchedule.vacation_type == vacation_type)
        if search:
            search_term = f"%{search.strip()}%"
            filters.append(
                or_(
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term),
                    User.username.ilike(search_term),
                    func.concat(User.last_name, " ", User.first_name).ilike(search_term),
                    func.concat(User.first_name, " ", User.last_name).ilike(search_term),
                )
            )

        base_query = (
            select(VacationSchedule)
            .join(VacationSchedule.user)
            .where(*filters)
        )
        total = await self.db.scalar(
            select(func.count()).select_from(VacationSchedule).join(VacationSchedule.user).where(*filters)
        )
        results = await self.db.execute(
            base_query
            .options(joinedload(VacationSchedule.user))
            .order_by(VacationSchedule.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return VacationScheduleList(
            vacations=list(results.scalars().unique().all()),
            offset=offset,
            limit=limit,
            total=total or 0,
        )

    async def create(
        self, vac_in: VacationScheduleCreate, current_user: User
    ) -> VacationSchedule:
        user = await self.user_repo.get_by_id(current_user.id)
        if not user or user.role != UserRoles.ADMIN:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден или не является администратором",
            )

        vacation = VacationSchedule(**vac_in.model_dump())
        self.db.add(vacation)
        await self.db.commit()
        await self.db.refresh(vacation)
        return vacation

    async def get_by_id(self, vac_id: int, current_user: User) -> VacationSchedule:
        user = await self.user_repo.get_by_id(current_user.id)
        if not user or user.role != UserRoles.ADMIN:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден или не является администратором",
            )

        vacation: VacationSchedule | None = await self.db.get(VacationSchedule, vac_id)
        if not vacation:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Отпуск не найдено"
            )
        return vacation

    async def update(
        self, vac_id: int, vac_in: VacationScheduleUpdate, current_user: User
    ) -> VacationSchedule:
        user = await self.user_repo.get_by_id(current_user.id)
        if not user or user.role != UserRoles.ADMIN:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден или не является администратором",
            )

        vacation: VacationSchedule | None = await self.db.get(VacationSchedule, vac_id)
        if not vacation:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Отпуск не найдено"
            )

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
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден или не является администратором",
            )

        vacation: VacationSchedule | None = await self.db.get(VacationSchedule, vac_id)
        if not vacation:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Отпуск не найдено"
            )

        await self.db.delete(vacation)
        await self.db.commit()

    async def get_active_vacations_with_remaining_days(
        self, current_user: User
    ) -> list[VacationScheduleRemainingList]:
        user = await self.user_repo.get_by_id(current_user.id)
        if not user or user.role != UserRoles.ADMIN:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден или не является администратором",
            )
        results = await self.db.execute(
            select(VacationSchedule).where(
                VacationSchedule.status == VacationStatus.ACTIVE
            )
        )
        vacations_list = results.scalars().unique().all()

        today = date.today()
        return [
            VacationScheduleRemainingList(
                vacation=VacationScheduleResponse.model_validate(v),
                days=(v.end_date - today).days,
            )
            for v in vacations_list
        ]

    # async def _check_for_vacation(self, user_id: int) -> bool:
    #     return bool(await self.db.scalar(
    #         select(
    #             exists().where(
    #                 and_(
    #                     VacationSchedule.user_id == user_id,
    #                     VacationSchedule.status == VacationStatus.ACTIVE,
    #                     VacationSchedule.start_date <= func.current_date(),
    #                     VacationSchedule.end_date >= func.current_date(),
    #                     )
    #             )
    #         )
    #     ))

    async def trigger_reassign(self, current_user: User) -> dict:
        user = await self.user_repo.get_by_id(current_user.id)
        if not user or user.role != UserRoles.ADMIN:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Для совершение операции требуется права администратора",
            )
        await self.db.execute(text("SELECT kcell_web.reassign_tasks_for_vacation()"))
        await self.db.commit()
        return {"status": "ok"}
