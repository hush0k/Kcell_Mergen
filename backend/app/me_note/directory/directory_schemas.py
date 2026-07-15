from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field

from app.me_note.note.schemas import MeNoteResponse

DirectoryName = Annotated[str, Field(min_length=3)]

class DirectoryBase(BaseModel):
    name: DirectoryName

class DirectoryCreate(DirectoryBase):
    pass

class DirectoryUpdate(BaseModel):
    name: DirectoryName | None = None

class DirectoryResponse(DirectoryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class DirectoryWithFilesResponse(DirectoryBase):
    id: int
    files: list[MeNoteResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DirectoryListResponse(BaseModel):
    list: list[DirectoryResponse]
    offset: int
    limit: int
    total: int