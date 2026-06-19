from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field

from app.mfs.enums import Action


class MfsAuditBase(BaseModel):
    user_id: int
    username: Annotated[str, Field(min_length=1)]
    action: Annotated[Action, Field(min_length=1)]
    msisdns_text: Annotated[str, Field(min_length=1)]
    results_json: list[dict] | None
    summary_ok: Annotated[int, Field(default=0)]
    summary_skipped: Annotated[int, Field(default=0)]
    summary_error: Annotated[int, Field(default=0)]

class MfsAuditCreate(MfsAuditBase):
    pass

class MfsAuditResponse(MfsAuditBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}

class MfsActionRequest(BaseModel):
    action: Action
    msisdns: Annotated[str, Field(min_length=1)]
