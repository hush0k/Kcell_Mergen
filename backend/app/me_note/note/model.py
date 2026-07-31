from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.core.mixins import TimeStampMixin
from app.db.database import Base

if TYPE_CHECKING:
    from app.user.model import User


me_note_tags = Table(
    "me_note_tags",
    Base.metadata,
    Column(
        "tag_id",
        Integer,
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.tags.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "me_note_id",
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.me_note.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    schema=settings.POSTGRES_SCHEMA,
)

me_note_editors = Table(
    "me_note_editors",
    Base.metadata,
    Column(
        "me_note_id",
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.me_note.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "user_id",
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.user.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    schema=settings.POSTGRES_SCHEMA,
)

me_note_readers = Table(
    "me_note_readers",
    Base.metadata,
    Column(
        "me_note_id",
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.me_note.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "user_id",
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.user.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    schema=settings.POSTGRES_SCHEMA,
)


class MeNote(Base, TimeStampMixin):
    __tablename__ = "me_note"
    __table_args__ = {"schema": settings.POSTGRES_SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False, default="Undefined")
    content: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    directory_id: Mapped[int | None] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.directory.id", ondelete="SET NULL"),
        nullable=True,
    )
    creater_id: Mapped[int | None] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.user.id", ondelete="SET NULL"),
        nullable=True,
    )
    last_modifier_id: Mapped[int | None] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.user.id", ondelete="SET NULL"),
        nullable=True,
    )
    last_version: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_editing: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    editor_id: Mapped[int | None] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.user.id", ondelete="SET NULL"),
        nullable=True,
    )
    editing_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    creater: Mapped[User | None] = relationship("User", foreign_keys=[creater_id])
    last_modifier: Mapped[User | None] = relationship(
        "User", foreign_keys=[last_modifier_id]
    )
    editor: Mapped[User | None] = relationship("User", foreign_keys=[editor_id])
    directory: Mapped[Directory | None] = relationship(
        "Directory", back_populates="files"
    )
    tags: Mapped[list[Tags]] = relationship(
        secondary=me_note_tags, back_populates="notes"
    )
    outgoing_links: Mapped[list[MeNoteLink]] = relationship(
        foreign_keys="[MeNoteLink.source_note_id]", cascade="all, delete-orphan"
    )
    attachments: Mapped[list[AttachedFiles]] = relationship(
        "AttachedFiles", back_populates="note", cascade="all, delete-orphan"
    )
    can_edit: Mapped[list[User]] = relationship(
        "User", secondary=me_note_editors, lazy="selectin"
    )
    can_read: Mapped[list[User]] = relationship(
        "User", secondary=me_note_readers, lazy="selectin"
    )


class MeNoteLink(Base):
    __tablename__ = "me_note_link"
    __table_args__ = {"schema": settings.POSTGRES_SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_note_id: Mapped[int] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.me_note.id", ondelete="CASCADE")
    )
    target_note_id: Mapped[int] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.me_note.id", ondelete="CASCADE")
    )


class Directory(Base, TimeStampMixin):
    __tablename__ = "directory"
    __table_args__ = {"schema": settings.POSTGRES_SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False, default="Undefined")

    files: Mapped[list[MeNote]] = relationship(back_populates="directory")


class Tags(Base):
    __tablename__ = "tags"
    __table_args__ = {"schema": settings.POSTGRES_SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False, default="Undefined")

    notes: Mapped[list[MeNote]] = relationship(
        secondary=me_note_tags, back_populates="tags"
    )


class AttachedFiles(Base, TimeStampMixin):
    __tablename__ = "attached_files"
    __table_args__ = {"schema": settings.POSTGRES_SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    note_id: Mapped[int] = mapped_column(
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.me_note.id", ondelete="CASCADE"),
        nullable=False,
    )
    path: Mapped[str] = mapped_column(Text, nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(127), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)

    note: Mapped[MeNote] = relationship("MeNote", back_populates="attachments")
