from typing import TYPE_CHECKING

from sqlalchemy import Integer, String, Enum, ForeignKey, Boolean, Text, ARRAY
from sqlalchemy.orm import mapped_column, Mapped, relationship

from app.core.config import settings
from app.core.mixins import TimeStampMixin
from app.db.database import Base

if TYPE_CHECKING:
    from app.user.model import User

class MeNote(Base, TimeStampMixin):
    __tablename__ = "me_note"
    __table_args__ = {"schema": settings.POSTGRES_SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False, default="Undefined")
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    creater_id: Mapped[int | None] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.user.id", ondelete="SET NULL"), nullable=True
    )
    last_modifier_id: Mapped[int | None] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.user.id", ondelete="SET NULL"), nullable=True
    )
    is_editing: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    editor_id: Mapped[int | None] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.user.id", ondelete="SET NULL"), nullable=True
    )


    creater: Mapped["User"] = relationship("User", foreign_keys=[creater_id])
    last_modifier: Mapped["User"] = relationship("User", foreign_keys=[last_modifier_id])
    editor: Mapped["User"] = relationship("User", foreign_keys=[editor_id])

