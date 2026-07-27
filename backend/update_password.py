import argparse
import asyncio

from app.auth.security import hash_password
from app.db.database import AsyncSessionLocal
from app.user.repository import UserRepository


async def update_password(email: str, password: str) -> None:
    async with AsyncSessionLocal() as db:
        repo = UserRepository(db)
        user = await repo.get_by_email(email)
        if user is None:
            print(f"Пользователь с email {email} не найден")
            return
        user.hashed_password = hash_password(password)
        user.must_change_password = True
        await repo.save_user(user)
        print(f"Пароль для {email} обновлен. При следующем входе потребуется смена пароля.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("-email", required=True)
    parser.add_argument("-password", required=True)
    args = parser.parse_args()

    asyncio.run(update_password(args.email, args.password))