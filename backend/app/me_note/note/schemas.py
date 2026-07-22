from datetime import datetime
from typing import Annotated, Any

from pydantic import BaseModel, Field

from app.user.schemas import UserBase


class TagsResponse(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}

class MeNoteBase(BaseModel):
    name: str | None = None
    content: dict[str, Any] | None = None
    last_version: dict[str, Any] | None = None
    directory_id: int | None = None


class MeNoteCreate(MeNoteBase):
    name: str | None = None
    directory_id: int
    tags: list[str] = []

class MeNoteUpdate(BaseModel):
    name: str | None = None
    content: dict[str, Any] | None = None
    last_version: dict[str, Any] | None = None
    tags: list[str] | None = None

class MeNoteResponse(MeNoteBase):
    id: int
    creater_id: int | None
    tags: list[TagsResponse] = []
    last_modifier_id: int | None
    editor_id: int | None
    is_editing: bool
    editing_started_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class MeNoteWithAll(MeNoteBase):
    id: int
    tags: list[TagsResponse] = []
    creater_id: int | None
    last_modifier_id: int | None
    editor_id: int | None
    creater: UserBase | None
    is_editing: bool
    editing_started_at: datetime | None = None
    last_modifier: UserBase | None
    editor: UserBase | None
    created_at: datetime
    updated_at: datetime

class MeNoteListResponse(BaseModel):
    list: list[MeNoteResponse]
    offset: int
    limit: int
    total: int


class MeNoteSearchResult(BaseModel):
    id: int
    name: str | None

    model_config = {"from_attributes": True}


class MeNoteGraphNode(BaseModel):
    id: int
    name: str | None


class MeNoteGraphEdge(BaseModel):
    source: int
    target: int


class MeNoteGraphResponse(BaseModel):
    nodes: list[MeNoteGraphNode]
    edges: list[MeNoteGraphEdge]