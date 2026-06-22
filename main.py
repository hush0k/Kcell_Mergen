import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.auth.router import router as auth_router
from app.control.router import router as control_router
from app.db.database import create_schema
from app.incident.router import router as incident_router
from app.mfs.router import router as mfs_router
from app.notification.listener import pg_notify_listener
from app.task.router import router as task_router
from app.user.router import router as user_router
from app.notification.router import router as notification_router
from app.vacation_schedule.router import router as vacation_schedule_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    await create_schema()
    task = asyncio.create_task(pg_notify_listener())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(lifespan=lifespan)

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(control_router)
app.include_router(task_router)
app.include_router(vacation_schedule_router)
app.include_router(incident_router)
app.include_router(mfs_router)
app.include_router(notification_router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "API is working"}
