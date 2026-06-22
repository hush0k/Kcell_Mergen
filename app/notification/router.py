from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.websockets import WebSocket, WebSocketDisconnect

from app.auth.dependencies import get_current_user, get_current_user_by_token
from app.db.database import get_db
from app.notification.connection_manager import manager
from app.notification.schemas import (
    NotificationRecipientResponse,
    NotificationReadResponse,
    UnreadCountResponse,
)
from app.notification.service import NotificationService
from app.user.model import User

router = APIRouter(prefix="/api/v1/notifications", tags=["Notification"])


def get_service(db: AsyncSession = Depends(get_db)) -> NotificationService:
    return NotificationService(db)


@router.get("", response_model=list[NotificationRecipientResponse])
async def get_notifications(
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100),
        current_user: User = Depends(get_current_user),
        service: NotificationService = Depends(get_service),
):
    return await service.get_user_notifications(current_user.id, page, limit)


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
        current_user: User = Depends(get_current_user),
        service: NotificationService = Depends(get_service),
):
    return await service.get_unread_count(current_user.id)


@router.get("/{notification_id}/html", response_class=HTMLResponse)
async def get_notification_html(
        notification_id: int,
        current_user: User = Depends(get_current_user),
        service: NotificationService = Depends(get_service),
):
    notification = await service.get_notification_html(notification_id, current_user.id)
    return HTMLResponse(content=notification.html_content)


@router.post("/{notification_id}/read", response_model=NotificationReadResponse)
async def mark_as_read(
        notification_id: int,
        current_user: User = Depends(get_current_user),
        service: NotificationService = Depends(get_service),
):
    return await service.mark_as_read(notification_id, current_user.id)

@router.websocket("/ws")
async def websocket_endpoint(
        websocket: WebSocket,
        token: str = Query(...),
        db: AsyncSession = Depends(get_db),
):
    user = await get_current_user_by_token(token, db)
    if not user:
        await websocket.close(code=1008)
        return

    await manager.connect(user.id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(user.id, websocket)
