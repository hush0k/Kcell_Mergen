from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.control.enums import Frequency, Area
from app.db.database import get_db
from app.task.enums import TaskStatus
from app.task.model import Task
from app.task.schemas import (
    TaskCreate,
    TaskGenerationResult,
    TaskList,
    TaskListWithControls,
    TaskResponse,
    TaskUpdate, TaskWithControlResponse,
)
from app.task.service import TaskService
from app.user.enums import UserRoles
from app.user.model import User

router = APIRouter(prefix="/api/v1/tasks", tags=["Task"])


def get_task_service(db: Annotated[AsyncSession, Depends(get_db)]) -> TaskService:
    return TaskService(db)


ServiceDep = Annotated[TaskService, Depends(get_task_service)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/", response_model=TaskList)
async def get_all_tasks(
    service: ServiceDep,
    current_user: CurrentUser,
    page: int = 1,
    limit: int = 100,
) -> TaskList:
    offset = (page - 1) * limit
    tasks, total = await service.get_all(current_user, offset, limit)
    return TaskList(task_list=tasks, total=total, offset=offset, limit=limit)


@router.get(
    "/tasks-with-controls",
    status_code=http_status.HTTP_200_OK,
    response_model=TaskListWithControls,
)
async def get_tasks_with_controls(
        service: ServiceDep,
        current_user: CurrentUser,
        status: list[TaskStatus] = Query(default=[]),
        frequency: Frequency | None = Query(default=None),
        user_id: int = Query(default=None),
        responsible_id: int = Query(default=None),
        area: list[Area] = Query(default=[]),
        search: str = Query(default=None),
        page: int = 1,
        limit: int = 20,
) -> TaskListWithControls:
    offset = (page - 1) * limit
    return await service.get_all_with_controls(current_user, status, frequency, area, user_id, responsible_id, search, offset, limit)

@router.get("/{task_id}/with-controls", response_model=TaskWithControlResponse)
async def get_task(
        service: ServiceDep,
        task_id: int,
        _: CurrentUser,
) -> TaskWithControlResponse:
    return await service.get_by_id_with_control(task_id)

@router.get("/not-started", response_model=list[TaskResponse])
async def get_not_started(
    service: ServiceDep,
    _: CurrentUser,
) -> list[Task]:
    return await service.get_not_started()


@router.get("/in-progress", response_model=list[TaskResponse])
async def get_in_progress(
    service: ServiceDep,
    current_user: CurrentUser,
) -> list[Task]:
    return await service.get_in_progress(current_user.id)


@router.get("/completed", response_model=list[TaskResponse])
async def get_completed(
    service: ServiceDep,
    current_user: CurrentUser,
) -> list[Task]:
    return await service.get_completed(current_user.id)


@router.get("/overdue", response_model=list[TaskResponse])
async def get_overdue(
    service: ServiceDep,
    current_user: CurrentUser,
) -> list[Task]:
    return await service.get_overdue(current_user.id)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    service: ServiceDep,
    _: CurrentUser,
) -> Task:
    return await service.get_task_by_id(task_id)


@router.post("/", response_model=TaskResponse, status_code=http_status.HTTP_201_CREATED)
async def create_task(
    task_in: TaskCreate,
    service: ServiceDep,
    _: CurrentUser,
) -> Task:
    return await service.create_task(task_in)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_in: TaskUpdate,
    service: ServiceDep,
    current_user: CurrentUser,
) -> Task:
    return await service.update_task(task_id, task_in, current_user)


@router.post("/{task_id}/start", response_model=TaskResponse)
async def start_task(
    task_id: int,
    service: ServiceDep,
    current_user: CurrentUser,
) -> Task:
    return await service.start_task(task_id, current_user.id)


@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: int,
    service: ServiceDep,
    _: CurrentUser,
) -> Task:
    return await service.complete_task(task_id)


@router.delete("/{task_id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    service: ServiceDep,
    current_user: CurrentUser,
) -> None:
    if current_user.role != UserRoles.ADMIN:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Для совершение операции требуется права администратора",
        )
    await service.delete_task(task_id)


@router.post(
    "/trigger-tasks-generator",
    status_code=http_status.HTTP_200_OK,
    response_model=TaskGenerationResult,
)
async def trigger_task_generator(
    service: ServiceDep, current_user: CurrentUser
) -> TaskGenerationResult:
    if current_user.role != UserRoles.ADMIN:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Для совершение операции требуется права администратора",
        )
    return await service.generate_tasks_via_db()


@router.post("/mark-overdue")
async def mark_overdue_tasks(db: AsyncSession = Depends(get_db)):
    """ Для ручного обновление просроченных задач """
    result = await db.execute(text("SELECT kcell_web.mark_overdue_tasks()"))
    await db.commit()
    count = result.scalar()
    return {"updated": count}
