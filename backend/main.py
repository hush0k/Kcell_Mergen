import asyncio
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.atlas.router import router as atlas_router
from app.auth.router import router as auth_router
from app.control.router import router as control_router
from app.core.config import settings
from app.db.database import create_schema
from app.incident.router import router as incident_router
from app.me_note.note.listener import pg_notify_me_note_listener
from app.me_note.note.ttl_sweeper import me_note_ttl_sweeper
from app.me_note.note.router import router as me_note_router
from app.me_note.directory.directory_router import router as directory_router
from app.me_note.attachments.router import router as attachments_router
from app.mfs.router import router as mfs_router
from app.notification.listener import pg_notify_listener
from app.notification.router import router as notification_router
from app.task.router import router as task_router
from app.tele2.SSHService import SSHService
from app.tele2.router import router as tele2_router
from app.user.router import router as user_router
from app.number_information.router import router as number_information_router
from app.report.router import router as report_router
from app.vacation_schedule.router import router as vacation_schedule_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    await create_schema()
    settings.ATTACHMENTS_DIR.mkdir(parents=True, exist_ok=True)

    app.state.ssh_service = SSHService()

    tasks: list[asyncio.Task] = []
    try:
        tasks.append(asyncio.create_task(pg_notify_listener()))
        tasks.append(asyncio.create_task(pg_notify_me_note_listener()))
        tasks.append(asyncio.create_task(me_note_ttl_sweeper()))
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

    await app.state.ssh_service.close()


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
app.include_router(directory_router)
app.include_router(attachments_router)
app.include_router(tele2_router)
app.include_router(number_information_router)
app.include_router(report_router)


@app.get("/api/public/config")
async def public_config() -> dict[str, str]:
    return {"deployment": "lite"}


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "API is working"}