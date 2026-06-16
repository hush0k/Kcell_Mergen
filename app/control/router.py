from typing import Annotated, Literal

from fastapi import APIRouter, Depends, status as http_status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.control.enums import ControlStatus
from app.control.model import Control
from app.control.schemas import ControlCreate, ControlResponse, ControlUpdate
from app.control.service import ControlService
from app.db.database import get_db
from app.user.model import User

router = APIRouter(prefix="/api/v1/controls", tags=["Control"])


def get_control_service(db: Annotated[AsyncSession, Depends(get_db)]) -> ControlService:
    return ControlService(db)


ServiceDep = Annotated[ControlService, Depends(get_control_service)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/", response_model=list[ControlResponse])
async def get_controls(
        service: ServiceDep,
        _: CurrentUser,
        area: str | None = None,
        control_status: ControlStatus | None = None,
        order_by: Literal[
            "name", "deadline_at", "time_estimate",
            "responsible_id", "backup_id", "status", "created_at"
        ] = "created_at",
        order_type: Literal["desc", "asc"] = "desc",
        page: int = 1,
        per_page: int = 20,
) -> list[Control]:
    return await service.get_controls(
        area=area,
        control_status=control_status,
        order_by=order_by,
        order_type=order_type,
        page=page,
        per_page=per_page,
    )


@router.get("/{control_id}", response_model=ControlResponse)
async def get_control(
        control_id: int,
        service: ServiceDep,
        _: CurrentUser,
) -> Control:
    return await service.get_control_by_id(control_id)


@router.post("/", response_model=ControlResponse, status_code=http_status.HTTP_201_CREATED)
async def create_control(
        control_in: ControlCreate,
        service: ServiceDep,
        _: CurrentUser,
) -> Control:
    return await service.create_control(control_in)


@router.put("/{control_id}", response_model=ControlResponse)
async def update_control(
        control_id: int,
        control_in: ControlUpdate,
        service: ServiceDep,
        _: CurrentUser,
) -> Control:
    return await service.update_control(control_in, control_id)


@router.delete("/{control_id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_control(
        control_id: int,
        service: ServiceDep,
        _: CurrentUser,
) -> None:
    await service.delete_control(control_id)