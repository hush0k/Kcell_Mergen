import enum


class Action(enum.Enum):
    BLOCK = "BLOCK"
    UNBLOCK = "UNBLOCK"
    CHECK = "CHECK"
    NOTE_ADD_FULL = "NOTE_ADD_FULL"
    NOTE_ADD_SHORT = "NOTE_ADD_SHORT"
    NOTE_DELETE = "NOTE_DELETE"
