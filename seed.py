import asyncio

from app.auth.security import hash_password
from app.db.database import AsyncSessionLocal
from app.user.enums import UserRoles
from app.user.model import User


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        user = User(
            username="admin",
            hashed_password=hash_password("Kanysh27!"),
            role=UserRoles.ADMIN,
        )
        db.add(user)
        await db.commit()
        print("Admin создан")


asyncio.run(seed())
