import io
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.report.schemas import ReportPeriod
from app.report.service import ReportService
from app.user.model import User

router = APIRouter(prefix="/api/v1/reports", tags=["Report"])


def get_report_service(db: Annotated[AsyncSession, Depends(get_db)]) -> ReportService:
    return ReportService(db)


ServiceDep = Annotated[ReportService, Depends(get_report_service)]
PeriodDep = Annotated[ReportPeriod, Depends()]
CurrentUser = Annotated[User, Depends(get_current_user)]

EXCEL_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _excel_response(buffer: io.BytesIO, filename: str) -> StreamingResponse:
    return StreamingResponse(
        buffer,
        media_type=EXCEL_MEDIA_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/list-1391")
async def get_list_1391(
    period: PeriodDep,
    service: ServiceDep,
    _: CurrentUser,
) -> list[dict[str, Any]]:
    return await service.get_list_1391(period)


@router.get("/list-1391/excel")
async def export_list_1391_excel(
    period: PeriodDep,
    service: ServiceDep,
    _: CurrentUser,
) -> StreamingResponse:
    buffer = await service.export_list_1391_excel(period)
    return _excel_response(buffer, "list_1391.xlsx")


@router.get("/mfs-blacklist")
async def get_mfs_blacklist(
    period: PeriodDep,
    service: ServiceDep,
    _: CurrentUser,
) -> list[dict[str, Any]]:
    return await service.get_mfs_blacklist(period)


@router.get("/mfs-blacklist/excel")
async def export_mfs_blacklist_excel(
    period: PeriodDep,
    service: ServiceDep,
    _: CurrentUser,
) -> StreamingResponse:
    buffer = await service.export_mfs_blacklist_excel(period)
    return _excel_response(buffer, "mfs_blacklist.xlsx")


@router.get("/nt-blocked")
async def get_nt_blocked(
    period: PeriodDep,
    service: ServiceDep,
    _: CurrentUser,
) -> list[dict[str, Any]]:
    return await service.get_nt_blocked(period)


@router.get("/nt-blocked/excel")
async def export_nt_blocked_excel(
    period: PeriodDep,
    service: ServiceDep,
    _: CurrentUser,
) -> StreamingResponse:
    buffer = await service.export_nt_blocked_excel(period)
    return _excel_response(buffer, "nt_blocked.xlsx")


@router.get("/top10-countries")
async def get_top10_countries(
    period: PeriodDep,
    service: ServiceDep,
    _: CurrentUser,
) -> list[dict[str, Any]]:
    return await service.get_top10_countries(period)


@router.get("/top10-countries/excel")
async def export_top10_countries_excel(
    period: PeriodDep,
    service: ServiceDep,
    _: CurrentUser,
) -> StreamingResponse:
    buffer = await service.export_top10_countries_excel(period)
    return _excel_response(buffer, "top10_countries.xlsx")
