from fastapi import FastAPI

from app import auth

app = FastAPI()

app.include_router(auth.router)
@app.get("/")
async def root():
    return {"message": "API is working"}
