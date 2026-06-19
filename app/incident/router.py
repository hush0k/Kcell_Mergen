from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi import status as http_status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.incident.model import Incident
from app.incident.schemas import (
    IncidentCreate,
    IncidentResponse,
    IncidentStatusUpdate,
    IncidentUpdate,
)
from app.incident.service import IncidentService
from app.user.enums import UserRoles
from app.user.model import User

router = APIRouter(prefix="/api/v1/incidents", tags=["Incident"])


def get_incident_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> IncidentService:
    return IncidentService(db)


ServiceDep = Annotated[IncidentService, Depends(get_incident_service)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/", response_model=list[IncidentResponse])
async def get_incidents(
    service: ServiceDep,
    _: CurrentUser,
    page: int = 1,
    limit: int = 20,
) -> list[Incident]:
    return await service.get_incidents(page, limit)


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: int,
    service: ServiceDep,
    _: CurrentUser,
) -> Incident:
    return await service.get_incident_by_id(incident_id)


@router.post(
    "/", response_model=IncidentResponse, status_code=http_status.HTTP_201_CREATED
)
async def create_incident(
    incident_in: IncidentCreate,
    service: ServiceDep,
    current_user: CurrentUser,
) -> Incident:
    return await service.create_incident(incident_in, current_user)


@router.patch("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: int,
    incident_in: IncidentUpdate,
    service: ServiceDep,
    current_user: CurrentUser,
) -> Incident:
    return await service.update_incident(incident_id, incident_in, current_user)


@router.patch("/{incident_id}/status", response_model=IncidentResponse)
async def change_incident_status(
    incident_id: int,
    status_in: IncidentStatusUpdate,
    service: ServiceDep,
    current_user: CurrentUser,
) -> Incident:
    return await service.change_status(incident_id, status_in.status, current_user)


@router.delete("/{incident_id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_incident(
    incident_id: int,
    service: ServiceDep,
    current_user: CurrentUser,
) -> None:
    if current_user.role != UserRoles.ADMIN:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Для совершение операции требуется права администратора",
        )
    await service.delete_incident(incident_id)
