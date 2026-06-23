import enum


class NotificationTypes(enum.Enum):
    TASK_CREATED = 'TASK_CREATED'
    TASK_UPDATED = 'TASK_UPDATED'
    INCIDENT_UPDATED = 'INCIDENT_UPDATED'