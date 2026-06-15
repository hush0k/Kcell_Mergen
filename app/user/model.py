from sqlalchemy import Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.core.mixins import TimeStampMixin
from app.db.database import Base
from app.user.enums import UserRoles


class User(Base, TimeStampMixin):
    __tablename__ = "user"
    __table_args__ = {"schema": settings.POSTGRES_SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(256), nullable=False)
    role: Mapped[UserRoles] = mapped_column(
        Enum(UserRoles, schema=settings.POSTGRES_SCHEMA, name="userroles"),
        default=UserRoles.USER,
        nullable=False,
    )