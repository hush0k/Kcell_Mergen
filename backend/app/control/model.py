from sqlalchemy import Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.control.enums import ControlStatus, Frequency
from app.core.config import settings
from app.core.mixins import TimeStampMixin
from app.db.database import Base
from app.user.model import User


class Control(Base, TimeStampMixin):
    __tablename__ = "control"
    __table_args__ = {"schema": settings.POSTGRES_SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    area: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    time_estimate: Mapped[int] = mapped_column(Integer)
    frequency: Mapped[Frequency] = mapped_column(
        Enum(
            Frequency,
            schema=settings.POSTGRES_SCHEMA,
            name="frequency",
            values_callable=lambda f: [e.value for e in f],
        ),
        default=Frequency.DAILY,
        nullable=False,
    )
    # deadline_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    responsible_id: Mapped[int] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.user.id"),
        index=True
    )
    backup_id: Mapped[int] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.user.id"),
        index=True
    )
    original_user_id: Mapped[int] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.user.id"),
        index=True
    )
    risk: Mapped[str] = mapped_column(String(64), default="0")
    priority: Mapped[str] = mapped_column(String(32), default="0")
    dashboard_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    status: Mapped[ControlStatus] = mapped_column(
        Enum(
            ControlStatus,
            schema=settings.POSTGRES_SCHEMA,
            name="controlstatus",
            values_callable=lambda x: [e.value for e in x],
        ),
        default=ControlStatus.ACTIVE,
    )

    # Relationships
    responsible: Mapped[User] = relationship("User", foreign_keys=[responsible_id])
    backup: Mapped[User] = relationship("User", foreign_keys=[backup_id])
    original: Mapped[User] = relationship("User", foreign_keys=[original_user_id])
