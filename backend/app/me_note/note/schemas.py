from datetime import datetime
from typing import Annotated, Any

from pydantic import BaseModel, Field, model_validator

from app.user.schemas import UserBase, UserBrief


def _extract_permission_ids(data: Any, edit_attr: str = "can_edit", read_attr: str = "can_read") -> Any:
    if hasattr(data, edit_attr) and not isinstance(data, dict):
        can_edit = getattr(data, edit_attr)
        can_read = getattr(data, read_attr)
        as_dict = {
            column.name: getattr(data, column.name)
            for column in data.__table__.columns
        }
        as_dict["can_edit_ids"] = [user.id for user in can_edit]
        as_dict["can_read_ids"] = [user.id for user in can_read]
        as_dict["can_edit"] = can_edit
        as_dict["can_read"] = can_read
        for extra_attr in ("tags", "creater", "last_modifier", "editor"):
            if hasattr(data, extra_attr):
                as_dict[extra_attr] = getattr(data, extra_attr)
        return as_dict
    return data


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

    can_edit_ids: list[int] = []
    can_read_ids: list[int] = []

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def _inject_permission_ids(cls, data: Any) -> Any:
        return _extract_permission_ids(data)

class MeNoteWithAll(MeNoteBase):
    id: int
    tags: list[TagsResponse] = []
    creater_id: int | None
    last_modifier_id: int | None
    editor_id: int | None
    creater: UserBase | None
    can_edit_ids: list[int] = []
    can_read_ids: list[int] = []
    can_edit: list[UserBrief] = []
    can_read: list[UserBrief] = []
    is_editing: bool
    editing_started_at: datetime | None = None
    last_modifier: UserBase | None
    editor: UserBase | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def _inject_permission_ids(cls, data: Any) -> Any:
        return _extract_permission_ids(data)

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