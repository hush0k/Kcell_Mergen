import tempfile
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi import status as http_status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.db.database import get_db
from app.tele2.SSHService import SSHService
from app.tele2.dependencies import get_ssh_service
from app.tele2.model import Tele2Log
from app.tele2.schemas import Tele2Create, Tele2Response, Tele2LogList
from app.tele2.service import Tele2Service
from app.user.model import User

router = APIRouter(prefix="/api/v1/tele2", tags=["Tele2"])


def get_tele2_service(db: Annotated[AsyncSession, Depends(get_db)]) -> Tele2Service:
    return Tele2Service(db)


ServiceDep = Annotated[Tele2Service, Depends(get_tele2_service)]
SSHServiceDep = Annotated[SSHService, Depends(get_ssh_service)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("/", response_model=Tele2Response, status_code=http_status.HTTP_201_CREATED)
async def create_tele2_log(
        create_in: Tele2Create,
        service: ServiceDep,
        ssh_service: SSHServiceDep,
        current_user: CurrentUser,
) -> Tele2Log:
    return await service.create(create_in, current_user, ssh_service)


@router.get("/", response_model=Tele2LogList)
async def get_tele2_logs(
        service: ServiceDep,
        _: CurrentUser,
        page: int = 1,
        limit: int = 20,
) -> Tele2LogList:
    return await service.get_all_logs(page, limit)

@router.get("/{log_id}/download")
async def download_tele2_file(
        log_id: int,
        service: ServiceDep,
        ssh_service: SSHServiceDep,
        _: CurrentUser,
):
    log = await service.get_by_id(log_id)
    local_path = Path(tempfile.gettempdir(), log.name)

    await ssh_service.download_file(f"{settings.SSH_REMOTE_DIR}/{log.name}", str(local_path))

    return FileResponse(
        path=local_path,
        filename=log.name,
        media_type="text/csv",
    )