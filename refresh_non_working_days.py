import asyncio
from datetime import date, timedelta

import holidays
from sqlalchemy import text

from app.db.database import AsyncSessionLocal


async def refresh_non_working_days(year: int) -> None:
    kz_holidays = holidays.Kazakhstan(years=[year])

    non_working: list[tuple[date, str]] = []

    # Праздники (включая переносы)
    for d, name in kz_holidays.items():
        non_working.append((d, name))

    # Субботы и воскресенья
    current = date(year, 1, 1)
    while current.year == year:
        if current.weekday() in (5, 6):  # 5=сб, 6=вс
            if current not in kz_holidays:  # не дублируем если праздник совпал
                day_name = "Суббота" if current.weekday() == 5 else "Воскресенье"
                non_working.append((current, day_name))
        current += timedelta(days=1)

    async with AsyncSessionLocal() as db:
        # Удаляем старые данные за этот год
        await db.execute(
            text("DELETE FROM kcell_web.non_working_days WHERE year = :year"),
            {"year": year},
        )

        # Вставляем новые
        for d, reason in non_working:
            await db.execute(
                text(
                    "INSERT INTO kcell_web.non_working_days (date, reason, year) "
                    "VALUES (:date, :reason, :year) "
                    "ON CONFLICT (date) DO NOTHING"
                ),
                {"date": d, "reason": reason, "year": year},
            )

        await db.commit()
        print(f"Заполнено {len(non_working)} нерабочих дней за {year} год")


asyncio.run(refresh_non_working_days(date.today().year))
