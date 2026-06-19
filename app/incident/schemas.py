from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, Field

from app.incident.enums import IncidentStatus

# Переиспользуемые типы
IncidentId = Annotated[int, Field(gt=0)]
TaskId = Annotated[int, Field(gt=0)]
Str255 = Annotated[str, Field(min_length=1, max_length=255)]
Money = Annotated[Decimal, Field(max_digits=15, decimal_places=2)]


class IncidentBase(BaseModel):
    control_type: Str255
    control_subtype: Str255
    detected_source: Str255
    reporting_month: date
    occurrence_date: date
    case_type: Annotated[str, Field(min_length=1, max_length=50)]
    incident_name: Str255
    description: Annotated[str, Field(min_length=1, max_length=4000)]
    risk: Str255 | None = None
    category: Str255 | None = None
    problem_area: Str255 | None = None
    solution_date: date | None = None
    close_date: date | None = None
    taken_measures: Annotated[str | None, Field(max_length=4000)] = None
    root_cause: Str255 | None = None
    estimated_loss: Money | None = None
    opportunity_loss: Money | None = None
    bad_debt: Money | None = None
    prevented_savings: Money | None = None
    recovered_savings: Money | None = None
    overchange: Money | None = None
    service_abused: Str255 | None = None
    count_fraudulent_numbers: int | None = None
    kpi_calculation: Money | None = None
    confirmed_fraud: Annotated[str | None, Field(max_length=3)] = None


class IncidentCreate(IncidentBase):
    task_id: TaskId
    status: IncidentStatus = IncidentStatus.OPEN


class IncidentUpdate(BaseModel):
    control_type: Str255 | None = None
    control_subtype: Str255 | None = None
    detected_source: Str255 | None = None
    reporting_month: date | None = None
    occurrence_date: date | None = None
    case_type: Annotated[str | None, Field(min_length=1, max_length=50)] = None
    incident_name: Str255 | None = None
    description: Annotated[str | None, Field(min_length=1, max_length=4000)] = None
    risk: Str255 | None = None
    category: Str255 | None = None
    problem_area: Str255 | None = None
    solution_date: date | None = None
    close_date: date | None = None
    taken_measures: Annotated[str | None, Field(max_length=4000)] = None
    root_cause: Str255 | None = None
    estimated_loss: Money | None = None
    opportunity_loss: Money | None = None
    bad_debt: Money | None = None
    prevented_savings: Money | None = None
    recovered_savings: Money | None = None
    overchange: Money | None = None
    service_abused: Str255 | None = None
    count_fraudulent_numbers: int | None = None
    kpi_calculation: Money | None = None
    confirmed_fraud: Annotated[str | None, Field(max_length=3)] = None


class IncidentStatusUpdate(BaseModel):
    status: IncidentStatus


class IncidentResponse(IncidentBase):
    id: IncidentId
    username: str
    task_id: int | None
    status: IncidentStatus
    attachment: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
