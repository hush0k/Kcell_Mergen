from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.number_information.LogService import LogService
from app.number_information.repository import NumberInformationRepository
from app.number_information.resolver import GraphResolver
from app.number_information.schemas import (
    NumberInformationBulkRequest,
    NumberInformationBulkResponse,
    NumberInformationResponse,
    NumberInformationRequest,
)
from app.number_information.service import OracleClientLookupService

router = APIRouter(
    prefix="/number_information",
    tags=["Number Information"],
)

def get_info_service(db: Annotated[AsyncSession, Depends(get_db)]) -> OracleClientLookupService:
    log_service = LogService(db)
    repository = NumberInformationRepository(db, log_service)
    resolver = GraphResolver(repository, log_service)
    return OracleClientLookupService(resolver)


ServiceDep = Annotated[OracleClientLookupService, Depends(get_info_service)]

@router.get("/get-info", response_model=NumberInformationResponse)
async def get_number_information(request: NumberInformationRequest, service: ServiceDep) -> NumberInformationResponse:
    return await service.get_client_data(request)

@router.get("/get-info-bulk", response_model=NumberInformationBulkResponse)
async def get_number_information_bulk(request: NumberInformationBulkRequest, service: ServiceDep) -> NumberInformationBulkResponse:
    return await service.get_clients_data(request)