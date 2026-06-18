from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.core.mixins import TimeStampMixin
from app.db.database import Base
from app.task.enums import TaskStatus

if TYPE_CHECKING:
    # from app.incident.model import Incident
    from app.control.model import Control
    from app.user.model import User


class Task(Base, TimeStampMixin):
    __tablename__ = "task"
    __table_args__ = {"schema": settings.POSTGRES_SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    control_id: Mapped[int] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.control.id"), nullable=False
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.user.id"), nullable=True
    )
    start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(
        default=TaskStatus.NOT_STARTED, nullable=False
    )
    weekend_group_id: Mapped[int | None] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.task.id"), nullable=True
    )
    deadline_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    control: Mapped[Control] = relationship(foreign_keys=[control_id], lazy="noload")
    user: Mapped[User | None] = relationship(foreign_keys=[user_id], lazy="noload")
    weekend_tasks: Mapped[list[Task]] = relationship(
        "Task",
        foreign_keys=[weekend_group_id],
        backref="weekend_group",
        remote_side=[id],
    )
    # incidents: Mapped[list["Incident"]] = relationship(
    #     back_populates="task",
    #     cascade="all, delete-orphan",
    # )



