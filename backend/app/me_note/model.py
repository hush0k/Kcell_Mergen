from sqlalchemy import Integer, String, Enum, ForeignKey, Boolean
from sqlalchemy.orm import mapped_column, Mapped

from app.core.config import settings
from app.core.mixins import TimeStampMixin
from app.db.database import Base
from app.me_note.enum import MimeTypes


class MeNote(Base, TimeStampMixin):
    __tablename__ = "me_note"
    __table_args__ = {"schema": settings.POSTGRES_SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False, default="Undefined")
    mime_type: Mapped[MimeTypes] = mapped_column(
        Enum(
            MimeTypes,
            schema=settings.POSTGRES_SCHEMA,
            name="mime_types",
            values_callable=lambda x: [e.name for e in x],
        ),
        default=MimeTypes.MD,
        nullable=False,
    )
    file_path: Mapped[str] = mapped_column(String, nullable=False, default="Undefined")
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    creater_id: Mapped[int] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.user.id", ondelete="SET NULL"), nullable=True
    )
    last_modifier_id: Mapped[int] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.user.id", ondelete="SET NULL"), nullable=True
    )
    is_editing: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

