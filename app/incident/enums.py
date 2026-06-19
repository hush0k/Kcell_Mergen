import enum
from enum import StrEnum


class IncidentStatus(enum.Enum):
    OPEN = "Открыт"
    ON_APPROVAL = "На согласовании"
    APPROVED = "Согласован"
    REJECTED = "Отклонён"

class ConfirmedFraud(enum.Enum):
    YES = "Да"
    NO = "Нет"
