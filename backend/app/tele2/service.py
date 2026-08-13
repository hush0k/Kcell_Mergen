import csv
import tempfile
from datetime import datetime
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.tele2.SSHService import SSHService
from app.tele2.model import Tele2Log
from app.tele2.repository import Tele2Repository
from app.tele2.schemas import Tele2Create, Tele2LogList, Tele2Response
from app.user.model import User


class Tele2Service:
    def __init__(self, db: AsyncSession):
        self.repo = Tele2Repository(db)

    async def create(self, create_in: Tele2Create, user: User, ssh_service: SSHService) -> Tele2Log:
        numbers_list = create_in.numbers.split()
        now = datetime.now().strftime("%d.%m.%Y_%H-%M-%S")
        name_of_file = f"tele_2_{now}.csv"
        local_path = Path(tempfile.gettempdir(), name_of_file)

        with open(local_path, "w", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            writer.writerow(["Номера"])
            writer.writerows([[number] for number in numbers_list])

        remote_path = f"{settings.SSH_REMOTE_DIR}/{name_of_file}"
        await ssh_service.upload_file(local_path=str(local_path), remote_path=remote_path)

        local_path.unlink()

        return await self.repo.create(numbers_list, name_of_file, user.id)

    async def get_all_logs(self, page: int, limit: int) -> Tele2LogList:
        offset = (page - 1) * limit
        logs, total = await self.repo.get_all(offset=offset, limit=limit)

        return Tele2LogList(
            log_list=[Tele2Response.model_validate(log) for log in logs],
            offset=offset,
            limit=limit,
            total=total,
        )

    async def get_by_id(self, log_id: int) -> Tele2Log:
        return await self.repo.get_by_id(log_id)


    async def download_file(self, remote_path: str, local_path: str, ssh_service: SSHService) -> None:
        await ssh_service.download_file(remote_path, local_path)





