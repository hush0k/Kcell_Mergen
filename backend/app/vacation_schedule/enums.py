import enum


class VacationType(enum.Enum):
    ANNUAL_LEAVE = "ANNUAL_LEAVE"
    SICK_LEAVE = "SICK_LEAVE"
    BUSINESS_TRIP = "BUSINESS_TRIP"


class VacationStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    CANCELLED = "CANCELLED"
