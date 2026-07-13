from datetime import datetime
from typing import Annotated, Any

from pydantic import BaseModel, Field

from app.user.schemas import UserBase


class MeNoteBase(BaseModel):
    name: str | None = None
    content: dict[str, Any] | None
    tags: list[str] = []
    directory_id: int | None


class MeNoteCreate(MeNoteBase):
    name: str | None = None
    directory_id: int

class MeNoteUpdate(BaseModel):
    name: str | None = None
    content: dict[str, Any] | None
    tags: list[str] | None = None

class MeNoteResponse(MeNoteBase):
    id: int
    creater_id: int | None
    last_modifier_id: int | None
    editor_id: int | None
    is_editing: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class MeNoteWithAll(MeNoteBase):
    id: int
    creater_id: int | None
    last_modifier_id: int | None
    editor_id: int | None
    creater: UserBase | None
    is_editing: bool
    last_modifier: UserBase | None
    editor: UserBase | None
    created_at: datetime
    updated_at: datetime

class MeNoteListResponse(BaseModel):
    list: list[MeNoteResponse]
    offset: int
    limit: int
    total: int