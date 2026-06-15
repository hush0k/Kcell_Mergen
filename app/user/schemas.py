import re
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.user.enums import UserRoles


def validate_strong_password(password: str) -> str:
    """
    Валидация пароля по использованным буквам, цифрам, и символам
    :param password:
    :return:
    """

    pattern = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!_%*?&])[A-Za-z\d@$!%*?&]{8,}$"
    if not re.match(pattern, password):
        raise ValueError(
            "Пароль должен содержать: "
            "минимум 8 символа, Заглавные буквы "
            "маленькие буквы, цифру и специальный символ"
        )
    return password


class UserBase(BaseModel):
    username: Annotated[str, Field(min_length=3, max_length=63)]
    role: UserRoles


class UserCreate(UserBase):
    password: Annotated[str, Field(min_length=8, max_length=100)]

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_strong_password(v)


class UserUpdate(BaseModel):
    username: Annotated[str, Field(min_length=3, max_length=63)] | None = None
    role: UserRoles


class UserUpdateRole(BaseModel):
    role: UserRoles = UserRoles.USER


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class UserUpdatePassword(BaseModel):
    """Валидация на сильный пароль а также проверка старого пароля чтобы реально ли владелец хочет изменить пароль."""

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
