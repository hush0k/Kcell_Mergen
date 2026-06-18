from unittest.mock import AsyncMock, MagicMock

import pytest

from app.control.enums import Frequency
from app.task.enums import TaskStatus
from app.task.model import Task
from app.task.service import TaskService


@pytest.mark.asyncio
async def test_sync_weekend_tasks_updates_statuses():
    # Arrange
    db = AsyncMock()
    service = TaskService(db)

    monday_task = MagicMock(spec=Task)
    monday_task.id = 1
    monday_task.weekend_group_id = 1
    monday_task.status = TaskStatus.IN_PROGRESS
    monday_task.control_id = 10

    saturday_task = MagicMock(spec=Task)
    saturday_task.id = 2
    saturday_task.weekend_group_id = 1
    saturday_task.status = TaskStatus.NOT_STARTED

    sunday_task = MagicMock(spec=Task)
    sunday_task.id = 3
    sunday_task.weekend_group_id = 1
    sunday_task.status = TaskStatus.NOT_STARTED

    control = MagicMock()
    control.frequency = (
        Frequency.DAILY
    )  # не BY_QUERY, чтобы не создавалась новая задача

    service.repo.get_by_id = AsyncMock(return_value=monday_task)
    service.repo.update = AsyncMock(return_value=monday_task)
    service.repo.get_tasks_by_weekend_id = AsyncMock(
        return_value=[saturday_task, sunday_task]
    )
    service.control_repo.get_by_id = AsyncMock(return_value=control)

    # Act
    await service.complete_task(task_id=1)

    # Assert
    assert saturday_task.status == TaskStatus.COMPLETED
    assert sunday_task.status == TaskStatus.COMPLETED
