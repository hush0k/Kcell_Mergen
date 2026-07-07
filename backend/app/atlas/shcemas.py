from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field


class AtlasNoteRequest(BaseModel):
    mode: Literal["add", "delete"]
    msisdns: Annotated[str, Field(min_length=1)]
    template: str = "restriction_full"


class AtlasNoteResponse(BaseModel):
    mode: str
    template: str | None
    results: list[dict[str, Any]]
    summary: dict[str, int]
    audit_id: int | None
    audit_warning: str | None = None


class AtlasStatusResponse(BaseModel):
    configured: bool
    hint: str | None = None
    note_templates: list[dict[str, str]]
