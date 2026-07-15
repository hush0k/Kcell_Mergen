from typing import Annotated

from fastapi import APIRouter, Depends, status, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.me_note.note.connection_manager import manager as ws_manager

from app.auth.dependencies import get_current_user, get_current_user_by_token
from app.db.database import get_db
from app.me_note.note.model import MeNote
from app.me_note.note.schemas import MeNoteResponse, MeNoteCreate, MeNoteUpdate, MeNoteListResponse, MeNoteWithAll
from app.me_note.note.service import MeNoteService
from app.user.model import User

router = APIRouter(prefix="/api/v1/me-note", tags=["MeNote"])


def get_note_service(db: Annotated[AsyncSession, Depends(get_db)]) -> MeNoteService:
    return MeNoteService(db)


ServiceDep = Annotated[MeNoteService, Depends(get_note_service)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("/", response_model=MeNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
        service: ServiceDep,
        note_in: MeNoteCreate,
        current_user: CurrentUser,
) -> MeNote:
    return await service.create_note(note_in, current_user.id)

@router.patch("/{note_id}", response_model=MeNoteResponse)
async def update_note(
        service: ServiceDep,
        note_id: int,
        note_in: MeNoteUpdate,
        current_user: CurrentUser,
) -> MeNote:
    return await service.update_note(note_id, note_in, current_user)

@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notes(
        service: ServiceDep,
        note_ids: Annotated[list[int], Query()],
        _: CurrentUser,
) -> None:
    return await service.delete_notes(note_ids)

@router.get("/", response_model=MeNoteListResponse)
async def list_notes(
        service: ServiceDep,
        _: CurrentUser,
        page: int = 1,
        per_page: int = 20,
) -> MeNoteListResponse:
    return await service.get_all_notes(page, per_page)

@router.get("/{note_id}", response_model=MeNoteWithAll)
async def get_note(
        service: ServiceDep,
        note_id: int,
        _: CurrentUser
)-> MeNoteWithAll:
    return await service.get_note(note_id)

@router.patch("/{note_id}/start-edit", status_code=status.HTTP_204_NO_CONTENT)
async def start_editing(
        service: ServiceDep,
        note_id: int,
        current_user: CurrentUser
) -> None:
    await service.start_editing(note_id, current_user)

@router.patch("/{note_id}/stop-edit", status_code=status.HTTP_204_NO_CONTENT)
async def stop_editing(
        service: ServiceDep,
        note_id: int,
        current_user: CurrentUser
) -> None:
    await service.stop_editing(note_id, current_user)

@router.websocket("/ws")
async def websocket_endpoint(
        websocket: WebSocket,
        token: str = Query(...),
        db: AsyncSession = Depends(get_db),
):
    user = await get_current_user_by_token(token, db)
    if not user:
        await websocket.accept()
        await websocket.close(code=1008)
        return

    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)