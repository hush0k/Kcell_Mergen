import enum


class Frequency(enum.StrEnum):
    DAILY = "ежедневно"
    WEEKLY = "еженедельно"
    MONTHLY = "ежемесячно"
    QUARTERLY = "ежеквартально"
    AS_REQUIRED = "по требованию"


class ControlStatus(enum.StrEnum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
