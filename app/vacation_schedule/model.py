from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.core.mixins import TimeStampMixin
from app.db.database import Base
from app.user.model import User
from app.vacation_schedule.enums import VacationStatus, VacationType


class VacationSchedule(Base, TimeStampMixin):
    __tablename__ = "vacation_schedule"
    __table_args__ = {"schema": settings.POSTGRES_SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey(f"{settings.POSTGRES_SCHEMA}.user.id"), nullable=False
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    vacation_type: Mapped[VacationType] = mapped_column(
        Enum(
            VacationType,
            schema=settings.POSTGRES_SCHEMA,
            name="vacation_type",
            values_callable=lambda x: [e.value for e in x],
        ),
        default=VacationType.ANNUAL_LEAVE,
        nullable=False,
    )
    status: Mapped[VacationStatus] = mapped_column(
        Enum(
            VacationStatus,
            schema=settings.POSTGRES_SCHEMA,
            name="vacation_status",
            values_callable=lambda x: [e.value for e in x],
        ),
        default=VacationStatus.ACTIVE,
        nullable=False,
    )

    # Relationships
    user: Mapped[User] = relationship("User", foreign_keys=[user_id])
