import enum


class Frequency(enum.Enum):
    DAILY = "ежедневно"
    WEEKLY = "еженедельно"
    MONTHLY = "ежемесячно"
    QUARTERLY = "ежеквартально"
    BY_QUERY = "по запросу"


class ControlStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"

class Area(enum.Enum):
    TF = "TF"
    IF = "IF"
    RA = "RA"
    A2P = "A2P"
    DEV = "DEV"
