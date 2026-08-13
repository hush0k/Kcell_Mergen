from typing import TYPE_CHECKING

from sqlalchemy import Enum, ARRAY, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, foreign, relationship

from app.core.config import settings
from app.core.mixins import TimeStampMixin
from app.db.database import Base
from app.tele2.enum import LogStatus

if TYPE_CHECKING:
    from app.user.model import User

class Tele2Log(Base, TimeStampMixin):
    __tablename__ = 'tele2_log'
    __table_args__ = {'schema': settings.POSTGRES_SCHEMA}

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=True)
    status: Mapped[LogStatus] = mapped_column(Enum(
        LogStatus,
        schema=settings.POSTGRES_SCHEMA,
        name='log_status',
        values_callable=lambda x: [e.value for e in x]
    ), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey(f"{settings.POSTGRES_SCHEMA}.user.id"), nullable=False)
    numbers: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])