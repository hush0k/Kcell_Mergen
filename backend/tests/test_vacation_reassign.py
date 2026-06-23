from datetime import date, timedelta

import pytest
import pytest_asyncio
from sqlalchemy import text

from app.control.enums import ControlStatus, Frequency
from app.control.model import Control
from app.user.enums import UserRoles
from app.user.model import User
from app.vacation_schedule.enums import VacationStatus, VacationType
from app.vacation_schedule.model import VacationSchedule


@pytest_asyncio.fixture(scope="session")
async def setup_data(db):
    """Создаём двух юзеров, контрол и отпуск."""
    responsible = User(
        username="responsible_user",
        hashed_password="hash",
        role=UserRoles.USER,
        is_og=False,
    )
    backup = User(
        username="backup_user",
        hashed_password="hash",
        role=UserRoles.USER,
        is_og=False,
    )
    db.add_all([responsible, backup])
    await db.flush()

    control = Control(
        area="Test",
        name="Test Control",
        time_estimate=30,
        frequency=Frequency.DAILY,
        responsible_id=responsible.id,
        backup_id=backup.id,
        original_user_id=responsible.id,
        risk="0",
        priority="0",
        status=ControlStatus.ACTIVE,
    )
    db.add(control)
    await db.flush()

    vacation = VacationSchedule(
        user_id=responsible.id,
        start_date=date.today() - timedelta(days=1),
        end_date=date.today() + timedelta(days=5),
        vacation_type=VacationType.ANNUAL_LEAVE,
        status=VacationStatus.ACTIVE,
    )
    db.add(vacation)
    await db.flush()

    return {"control": control, "responsible": responsible, "backup": backup}


@pytest.mark.asyncio
async def test_reassign_sets_backup_when_on_vacation(db, setup_data):
    control = setup_data["control"]
    backup = setup_data["backup"]

    await db.execute(text("SELECT kcell_web.reassign_tasks_for_vacation()"))
    await db.flush()
    await db.refresh(control)

    assert control.responsible_id == backup.id


@pytest.mark.asyncio
async def test_reassign_restores_original_when_vacation_ends(db, setup_data):
    control = setup_data["control"]
    responsible = setup_data["responsible"]

    # Заканчиваем отпуск
    await db.execute(
        text(
            "UPDATE kcell_web.vacation_schedule SET end_date = :d WHERE user_id = :uid"
        ).bindparams(d=date.today() - timedelta(days=1), uid=responsible.id)
    )
    await db.flush()

    await db.execute(text("SELECT kcell_web.reassign_tasks_for_vacation()"))
    await db.flush()
    await db.refresh(control)

    assert control.responsible_id == responsible.id
