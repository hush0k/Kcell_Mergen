from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.core.mixins import TimeStampMixin
from app.db.database import Base
from app.incident.enums import IncidentStatus, ConfirmedFraud

if TYPE_CHECKING:
    from app.task.model import Task


class Incident(Base, TimeStampMixin):
    __tablename__ = "incident"
    __table_args__ = {"schema": settings.POSTGRES_SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[IncidentStatus] = mapped_column(
        Enum(
            IncidentStatus,
            schema=settings.POSTGRES_SCHEMA,
            name="incidentstatus",
            values_callable=lambda x: [e.value for e in x],
        ),
        default=IncidentStatus.OPEN,
        nullable=False,
    )
    control_type: Mapped[str] = mapped_column(String(255), nullable=False)
    control_subtype: Mapped[str] = mapped_column(String(255), nullable=False)
    risk: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    problem_area: Mapped[str | None] = mapped_column(String(255), nullable=True)
    detected_source: Mapped[str] = mapped_column(String(255), nullable=False)
    reporting_month: Mapped[date] = mapped_column(Date, nullable=False)
    occurrence_date: Mapped[date] = mapped_column(Date, nullable=False)
    solution_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    close_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    incident_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    taken_measures: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    root_cause: Mapped[str | None] = mapped_column(String(255), nullable=True)
    estimated_loss: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    opportunity_loss: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    bad_debt: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    prevented_savings: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    recovered_savings: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    overchange: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    service_abused: Mapped[str | None] = mapped_column(String(255), nullable=True)
    count_fraudulent_numbers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    case_type: Mapped[str] = mapped_column(String(50), nullable=False)
    attachment: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    kpi_calculation: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    confirmed_fraud: Mapped[ConfirmedFraud | None] = mapped_column(Enum(
        ConfirmedFraud,
        schema=settings.POSTGRES_SCHEMA,
        name="confirmed_fraud",
        values_callable=lambda x: [e.value for e in x],
    ), nullable=True)
    task_id: Mapped[int | None] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.task.id"), nullable=True
    )

    # Relationships
    task: Mapped[Task | None] = relationship(
        back_populates="incidents", foreign_keys=[task_id], lazy="noload"
    )