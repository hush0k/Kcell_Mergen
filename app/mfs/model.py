from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.db.database import Base
from app.mfs.enums import Action
from app.user.model import User


class MfsAuditLog(Base):
    __tablename__ = "mfs_audit_log"
    __table_args__ = {"schema": settings.POSTGRES_SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey(f"{settings.POSTGRES_SCHEMA}.user.id"), nullable=False
    )
    username: Mapped[str] = mapped_column(String(64), nullable=False)
    action: Mapped[Action] = mapped_column(
        Enum(
            Action,
            schema=settings.POSTGRES_SCHEMA,
            name="action",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
    )
    msisdns_text: Mapped[str] = mapped_column(Text, nullable=False)
    results_json: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSONB, nullable=True
    )
    summary_ok: Mapped[int] = mapped_column(Integer, default=0)
    summary_skipped: Mapped[int] = mapped_column(Integer, default=0)
    summary_error: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    user: Mapped[User] = relationship("User", foreign_keys=[user_id])
