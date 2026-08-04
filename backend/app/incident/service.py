from fastapi import HTTPException
from fastapi import status as http_status
from sqlalchemy.ext.asyncio import AsyncSession

from app.incident.enums import IncidentStatus
from app.incident.model import Incident
from app.incident.repository import IncidentRepository
from app.incident.schemas import IncidentCreate, IncidentUpdate
from app.task.enums import TaskStatus
from app.task.repository import TaskRepository
from app.user.enums import UserRoles
from app.user.model import User

# Разрешённые переходы статусов: Открыт → На согласовании → Согласован/Отклонён
ALLOWED_TRANSITIONS: dict[IncidentStatus, set[IncidentStatus]] = {
    IncidentStatus.OPEN: {IncidentStatus.ON_APPROVAL},
    IncidentStatus.ON_APPROVAL: {IncidentStatus.APPROVED, IncidentStatus.REJECTED},
    IncidentStatus.APPROVED: set(),
    IncidentStatus.REJECTED: set(),
}


class IncidentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = IncidentRepository(db)
        self.task_repo = TaskRepository(db)

    async def get_incident_by_id(self, incident_id: int) -> Incident:
        incident = await self.repo.get_by_id(incident_id)
        if not incident:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Инцидент не найден"
            )
        return incident

    async def get_incidents(self, page: int = 1, limit: int = 20) -> list[Incident]:
        offset = (page - 1) * limit
        return await self.repo.get_all(offset, limit)

    async def create_incident(
        self, incident_in: IncidentCreate, current_user: User
    ) -> Incident:
        task = await self.task_repo.get_by_id(incident_in.task_id)
        if not task:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Задача не найдена"
            )
        if task.status != TaskStatus.COMPLETED:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Инцидент можно создать только для завершённой задачи",
            )
        return await self.repo.create(incident_in, current_user.username)

    async def update_incident(
        self, incident_id: int, incident_in: IncidentUpdate, current_user: User
    ) -> Incident:
        incident = await self.get_incident_by_id(incident_id)
        self._check_author_or_admin(incident, current_user)

        if incident.status != IncidentStatus.OPEN:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Инцидент можно редактировать только в статусе «Открыт»",
            )
        return await self.repo.update(incident, incident_in)

    async def change_status(
        self, incident_id: int, new_status: IncidentStatus, current_user: User
    ) -> Incident:
        incident = await self.get_incident_by_id(incident_id)
        is_admin = current_user.role == UserRoles.ADMIN

        if new_status not in ALLOWED_TRANSITIONS[incident.status]:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Недопустимый переход статуса: {incident.status} → {new_status}",
            )

        if new_status == IncidentStatus.ON_APPROVAL:
            self._check_author_or_admin(incident, current_user)
        elif (
            new_status in (IncidentStatus.APPROVED, IncidentStatus.REJECTED)
            and not is_admin
        ):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Только администратор может согласовать или отклонить инцидент",
            )

        incident.status = new_status
        return await self.repo._save_incident(incident)

    async def delete_incident(self, incident_id: int) -> None:
        incident = await self.get_incident_by_id(incident_id)
        await self.repo.delete(incident)

    @staticmethod
    def _check_author_or_admin(incident: Incident, current_user: User) -> None:
        is_admin = current_user.role == UserRoles.ADMIN
        is_author = incident.username == current_user.username
        if not (is_admin or is_author):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав: редактировать может только автор или администратор",
            )
