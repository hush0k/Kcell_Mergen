from pydantic import BaseModel, ConfigDict

from app.tele2.enum import LogStatus


class Tele2Base(BaseModel):
    name: str | None = None

class Tele2Create(Tele2Base):
    numbers: str

class Tele2Response(Tele2Base):
    id: int
    status: LogStatus
    numbers: list[str]

    model_config = ConfigDict(from_attributes=True)


class Tele2LogList(BaseModel):
    log_list: list[Tele2Response]
    offset: int
    limit: int
    total: int
