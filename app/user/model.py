from sqlalchemy import Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.user.enums import UserRoles


class User(Base):
    """Модель пользователя системы"""

    __tablename__ = "user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    role: Mapped[UserRoles] = mapped_column(
        Enum(UserRoles),
        default=UserRoles.USER,
        nullable=False,  # UserRole может быть ADMIN либо USER
    )
