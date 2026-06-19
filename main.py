from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.auth.router import router as auth_router
from app.control.router import router as control_router
from app.db.database import create_schema
from app.task.router import router as task_router
from app.vacation_schedule.router import router as vacation_schedule_router
from app.user.router import router as user_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    await create_schema()
    yield


app = FastAPI(lifespan=lifespan)

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(control_router)
app.include_router(task_router)
app.include_router(vacation_schedule_router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "API is working"}
