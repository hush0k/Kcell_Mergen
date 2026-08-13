from pathlib import Path
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio

from app.tele2.schemas import Tele2Create
from app.tele2.service import Tele2Service
from app.user.enums import UserRoles
from app.user.model import User


@pytest_asyncio.fixture(scope="session")
async def test_user(db):
    user = User(
        username="tele2_test_user",
        email="tele2_test@test.local",
        hashed_password="hashKsn18!",
        role=UserRoles.USER,
        is_og=False,
    )
    db.add(user)
    await db.flush()
    return user


@pytest.mark.asyncio
async def test_create_generates_correct_csv_and_uploads_via_sftp(db, test_user):
    service = Tele2Service(db)
    ssh_service_mock = AsyncMock()

    captured: dict[str, str] = {}

    async def fake_upload_file(local_path: str, remote_path: str) -> None:
        captured["content"] = Path(local_path).read_text(encoding="utf-8")
        captured["remote_path"] = remote_path

    ssh_service_mock.upload_file.side_effect = fake_upload_file

    create_in = Tele2Create(numbers="70001112233 70004445566 70007778899")

    result = await service.create(create_in, test_user, ssh_service_mock)

    ssh_service_mock.upload_file.assert_called_once()

    content = captured["content"]
    lines = content.strip().splitlines()
    assert lines[0] == "Номера"
    assert len(lines) == 4
    assert lines[1] == "70001112233"

    assert captured["remote_path"].endswith(result.name)
    assert result.name.startswith("tele_2_")
    assert result.name.endswith(".csv")