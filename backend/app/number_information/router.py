from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.number_information.LogService import LogService
from app.number_information.repository import NumberInformationRepository
from app.number_information.resolver import GraphResolver
from app.number_information.schemas import (
    NumberInformationBulkRequest,
    NumberInformationLoginResponse,
    NumberInformationResponse,
    NumberInformationRequest,
)
from app.number_information.service import OracleClientLookupService

router = APIRouter(
    prefix="/number_information",
    tags=["Number Information"],
)

EXCEL_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

def get_info_service(db: Annotated[AsyncSession, Depends(get_db)]) -> OracleClientLookupService:
    log_service = LogService(db)
    repository = NumberInformationRepository(db, log_service)
    resolver = GraphResolver(repository, log_service)
    return OracleClientLookupService(resolver)


ServiceDep = Annotated[OracleClientLookupService, Depends(get_info_service)]


def get_log_service(db: Annotated[AsyncSession, Depends(get_db)]) -> LogService:
    return LogService(db)


LogServiceDep = Annotated[LogService, Depends(get_log_service)]

@router.post("/get-info", response_model=NumberInformationResponse)
async def get_number_information(request: NumberInformationRequest, service: ServiceDep) -> NumberInformationResponse:
    return await service.get_client_data(request)

@router.post("/get-info-bulk")
async def get_number_information_bulk(request: NumberInformationBulkRequest, service: ServiceDep) -> StreamingResponse:
    buffer = await service.export_clients_data_excel(request)
    return StreamingResponse(
        buffer,
        media_type=EXCEL_MEDIA_TYPE,
        headers={"Content-Disposition": 'attachment; filename="number_information.xlsx"'},
    )


@router.get("/logs", response_model=list[NumberInformationLoginResponse])
async def list_number_information_logs(log_service: LogServiceDep) -> list[NumberInformationLoginResponse]:
    return await log_service.list_logs()


@router.get("/logs/{log_id}", response_model=NumberInformationLoginResponse)
async def get_number_information_log(log_id: int, log_service: LogServiceDep) -> NumberInformationLoginResponse:
    log = await log_service.get_log(log_id)
    if log is None:
        raise HTTPException(status_code=404, detail="Log not found")
    return log