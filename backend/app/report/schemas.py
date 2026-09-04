from datetime import UTC, datetime

from pydantic import BaseModel, model_validator


def _last_month_range(now: datetime | None = None) -> tuple[datetime, datetime]:
    now = now or datetime.now(UTC)
    first_day_current_month = now.replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )
    end = first_day_current_month
    if first_day_current_month.month == 1:
        start = first_day_current_month.replace(
            year=first_day_current_month.year - 1, month=12
        )
    else:
        start = first_day_current_month.replace(
            month=first_day_current_month.month - 1
        )
    return start, end


class ReportPeriod(BaseModel):

    start_time: datetime | None = None
    end_time: datetime | None = None

    @model_validator(mode="after")
    def apply_default_last_month(self) -> ReportPeriod:
        if self.start_time is None or self.end_time is None:
            default_start, default_end = _last_month_range()
            if self.start_time is None:
                self.start_time = default_start
            if self.end_time is None:
                self.end_time = default_end
        return self

    @property
    def start(self) -> datetime:
        assert self.start_time is not None
        return self.start_time

    @property
    def end(self) -> datetime:
        assert self.end_time is not None
        return self.end_time
