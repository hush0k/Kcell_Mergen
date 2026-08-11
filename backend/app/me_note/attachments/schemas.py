from pydantic import BaseModel


class AttachmentsBase(BaseModel):
    note_id: int
    path: str
    original_name: str
    mime_type: str
    size_bytes: int


class AttachmentsCreate(AttachmentsBase):
    pass


class AttachmentsResponse(AttachmentsBase):
    id: int

    model_config = {"from_attributes": True}
