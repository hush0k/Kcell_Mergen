import enum


class Frequency(enum.StrEnum):
    DAILY = "ежедневно"
    WEEKLY = "еженедельно"
    MONTHLY = "ежемесячно"
    QUARTERLY = "ежеквартально"
    BY_QUERY = "по запросу"


class ControlStatus(enum.StrEnum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
