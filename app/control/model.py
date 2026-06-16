from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.control.enums import ControlStatus, Frequency
from app.core.config import settings
from app.core.mixins import TimeStampMixin
from app.db.database import Base
from app.user.model import User


class Control(Base, TimeStampMixin):
    __tablename__ = "control"
    __table_args__ = {"schema": settings.POSTGRES_SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    area: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(String)
    time_estimate: Mapped[int] = mapped_column(Integer)
    frequency: Mapped[Frequency] = mapped_column(
        Enum(Frequency), default=Frequency.DAILY, nullable=False
    )
    deadline_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    responsible_id: Mapped[int] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.user.id")
    )
    backup_id: Mapped[int] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.user.id")
    )
    risk: Mapped[str] = mapped_column(String(64), default="0")
    priority: Mapped[str] = mapped_column(String(32), default="0")
    dashboard_url: Mapped[str] = mapped_column(String(512))
    status: Mapped[ControlStatus] = mapped_column(
        Enum(ControlStatus), default=ControlStatus.ACTIVE
    )

    # Relationships
    responsible: Mapped[User] = relationship("User", foreign_keys=[responsible_id])
    backup: Mapped[User] = relationship("User", foreign_keys=[backup_id])
