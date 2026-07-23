from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.websockets import WebSocket, WebSocketDisconnect

from app.auth.dependencies import get_current_user, get_current_user_by_token
from app.db.database import get_db, AsyncSessionLocal
from app.notification.connection_manager import manager
from app.notification.model import Notification
from app.notification.schemas import (
    NotificationRecipientResponse,
    NotificationReadResponse,
    UnreadCountResponse, NotificationResponse, NotificationCreate, NotificationsList,
)
from app.notification.service import NotificationService
from app.user.model import User

router = APIRouter(prefix="/api/v1/notifications", tags=["Notification"])


def get_service(db: AsyncSession = Depends(get_db)) -> NotificationService:
    return NotificationService(db)

ServiceDep = Annotated[NotificationService, Depends(get_service)]


@router.get("", response_model=NotificationsList)
async def get_notifications(
        service: ServiceDep,
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100),
        is_read: bool | None = Query(None),
        current_user: User = Depends(get_current_user),
):
    return await service.get_user_notifications(current_user.id, page, limit, is_read)


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
        service: ServiceDep,
        current_user: User = Depends(get_current_user),
):
    return await service.get_unread_count(current_user.id)


@router.get("/{notification_id}/html", response_class=HTMLResponse)
async def get_notification_html(
        service: ServiceDep,
        notification_id: int,
        current_user: User = Depends(get_current_user),
):
    notification = await service.get_notification_html(notification_id, current_user.id)
    return HTMLResponse(content=notification.html_content)


@router.post("/{notification_id}/read", response_model=NotificationReadResponse)
async def mark_as_read(
        service: ServiceDep,
        notification_id: int,
        current_user: User = Depends(get_current_user),
):
    return await service.mark_as_read(notification_id, current_user.id)


@router.patch("/{notification_id}/become_responsible_user", response_model=NotificationResponse)
async def become_responsible_user(
        service: ServiceDep,
        notification_id: int,
        current_user: User = Depends(get_current_user),
) -> Notification:
    return await service.become_responsible_user(notification_id, current_user.id)


@router.patch("/{notification_id}/end_notificaiton_task", response_model=NotificationResponse)
async def end_notification_task(
        service: ServiceDep,
        notification_id: int,
        current_user: User = Depends(get_current_user),
) -> Notification:
    return await service.end_notification(notification_id, current_user)


@router.post("/", response_model=NotificationResponse)
async def create_notification_endpoint(
        service: ServiceDep,
        notification_in: NotificationCreate,
        _: User = Depends(get_current_user),
) -> Notification:
    return await service.create_notification(notification_in)


@router.websocket("/ws")
async def websocket_endpoint(
        websocket: WebSocket,
        token: str = Query(...),
):
    async with AsyncSessionLocal() as db:
        user = await get_current_user_by_token(token, db)
    if not user:
        # Must accept before closing so the browser actually receives the
        # 1008 close code instead of seeing a bare HTTP 403 handshake
        # rejection (which JS reports as an opaque code 1006 close).
        await websocket.accept()
        await websocket.close(code=1008)
        return

    await manager.connect(user.id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(user.id, websocket)

@router.get("/{notification_id}", response_model=NotificationRecipientResponse)
async def get_notification(
        service: ServiceDep,
        notification_id: int,
        current_user: User = Depends(get_current_user),
):
    return await service.get_notification(notification_id, current_user.id)