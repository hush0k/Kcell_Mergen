import re
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.user.enums import UserRoles

# Переиспользуемые типы
Username = Annotated[str, Field(min_length=3, max_length=63)]
Password = Annotated[str, Field(min_length=8, max_length=100)]


def validate_strong_password(password: str) -> str:
    pattern = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!_%*?&])[A-Za-z\d@$!%*?&]{8,}$"
    if not re.match(pattern, password):
        raise ValueError(
            "Пароль должен содержать: "
            "минимум 8 символов, заглавные буквы, "
            "маленькие буквы, цифру и специальный символ"
        )
    return password


class UserBase(BaseModel):
    username: Username
    first_name: str | None
    last_name: str | None
    role: UserRoles
    email: str | None
    is_og: bool
    must_change_password: bool = False


class UserCreate(UserBase):
    password: Password

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_strong_password(v)


class UserUpdate(BaseModel):
    username: Username | None = None
    first_name: str | None = None
    last_name: str | None = None
    role: UserRoles | None = None
    email: str | None = None
    is_og: bool | None = None
    must_change_password: bool | None = None


class UserUpdateRole(BaseModel):
    role: UserRoles = UserRoles.USER


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class UserUpdatePassword(BaseModel):
    """Валидация на сильный пароль, а также проверка старого пароля."""

    old_password: str
    new_password: str
    repeat_new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_strong_password(v)

    @model_validator(mode="after")
    def validate_passwords_match(self) -> UserUpdatePassword:
        if self.new_password != self.repeat_new_password:
            raise ValueError("Пароли не совпадают")
        return self

class UserBrief(BaseModel):
    id: int
    username: str
    first_name: str | None = None
    last_name: str | None = None
    is_og: bool | None = None

    model_config = {"from_attributes": True}
