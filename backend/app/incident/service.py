from datetime import datetime, timezone

from fastapi import HTTPException
from fastapi import status as http_status
from sqlalchemy.ext.asyncio import AsyncSession

from app.incident.enums import IncidentStatus
from app.incident.model import Incident
from app.incident.repository import IncidentRepository
from app.incident.schemas import IncidentCreate, IncidentUpdate
from app.notification.service import NotificationService
from app.task.enums import TaskStatus
from app.task.repository import TaskRepository
from app.user.enums import UserRoles
from app.user.model import User

ALLOWED_TRANSITIONS: dict[IncidentStatus, set[IncidentStatus]] = {
    IncidentStatus.OPEN: {IncidentStatus.ON_APPROVAL},
    IncidentStatus.ON_APPROVAL: {IncidentStatus.APPROVED, IncidentStatus.REJECTED},
    IncidentStatus.APPROVED: set(),
    IncidentStatus.REJECTED: {IncidentStatus.ON_APPROVAL},
}


class IncidentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = IncidentRepository(db)
        self.task_repo = TaskRepository(db)
        self.notification_service = NotificationService(db)

    async def get_incident_by_id(self, incident_id: int) -> Incident:
        incident = await self.repo.get_by_id(incident_id)
        if not incident:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Инцидент не найден"
            )
        return incident

    async def get_incidents(
        self,
        page: int = 1,
        limit: int = 20,
        status: IncidentStatus | None = None,
        case_type: str | None = None,
    ) -> list[Incident]:
        offset = (page - 1) * limit
        return await self.repo.get_all(offset, limit, status, case_type)

    async def create_incident(
        self, incident_in: IncidentCreate, current_user: User
    ) -> Incident:
        task = await self.task_repo.get_by_id(incident_in.task_id)
        if not task:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Задача не найдена"
            )
        if task.status not in (TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS):
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Инцидент можно создать только для задачи в процессе или завершённой",
            )
        return await self.repo.create(incident_in, current_user.username)

    async def update_incident(
        self, incident_id: int, incident_in: IncidentUpdate, current_user: User
    ) -> Incident:
        incident = await self.get_incident_by_id(incident_id)
        self._check_author_or_admin(incident, current_user)

        if incident.status not in (IncidentStatus.OPEN, IncidentStatus.REJECTED):
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Инцидент можно редактировать только в статусе «Открыт» или «Отклонён»",
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

        if new_status == IncidentStatus.APPROVED:
            incident.approved_by_id = current_user.id
            incident.approved_at = datetime.now(timezone.utc)
            incident.rejected_by_id = None
            incident.rejected_at = None
        elif new_status == IncidentStatus.REJECTED:
            incident.rejected_by_id = current_user.id
            incident.rejected_at = datetime.now(timezone.utc)
        elif new_status == IncidentStatus.ON_APPROVAL:
            incident.approved_by_id = None
            incident.approved_at = None
            incident.rejected_by_id = None
            incident.rejected_at = None

        saved = await self.repo._save_incident(incident)

        if new_status == IncidentStatus.ON_APPROVAL:
            await self.notification_service.create_incident_approval_notification(saved)

        return saved

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
