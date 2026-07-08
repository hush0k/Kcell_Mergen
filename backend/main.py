import asyncio
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.atlas.router import router as atlas_router
from app.auth.router import router as auth_router
from app.control.router import router as control_router
from app.db.database import create_schema
from app.incident.router import router as incident_router
from app.me_note.listener import pg_notify_me_note_listener
from app.me_note.router import router as me_note_router
from app.mfs.router import router as mfs_router
from app.notification.listener import pg_notify_listener
from app.notification.router import router as notification_router
from app.task.router import router as task_router
from app.user.router import router as user_router
from app.vacation_schedule.router import router as vacation_schedule_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    await create_schema()

    tasks: list[asyncio.Task] = []
    try:
        tasks.append(asyncio.create_task(pg_notify_listener()))
        tasks.append(asyncio.create_task(pg_notify_me_note_listener()))
    except Exception as e:
        logger.error(f"LISTENER START ERROR: {e}")

    yield

    for task in tasks:
        task.cancel()
    for task in tasks:
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
app.include_router(atlas_router)
app.include_router(notification_router)
app.include_router(me_note_router)


@app.get("/api/public/config")
async def public_config() -> dict[str, str]:
    return {"deployment": "lite"}


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "API is working"}