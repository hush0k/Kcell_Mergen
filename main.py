from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import auth
from app.db.database import create_schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_schema()
    yield

app = FastAPI(lifespan=lifespan)

app.include_router(auth.router)
@app.get("/")
async def root():
    return {"message": "API is working"}
