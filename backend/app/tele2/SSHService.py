import logging
import shutil
from pathlib import Path

import asyncssh

from app.core.config import settings

logger = logging.getLogger(__name__)


class SSHService:
    def __init__(self):
        self._conn: asyncssh.SSHClientConnection | None = None

    async def _get_connection(self) -> asyncssh.SSHClientConnection:
        if self._conn is None or self._conn.is_closed():
            self._conn = await asyncssh.connect(
                host=settings.SSH_HOST,
                username=settings.SSH_USERNAME,
                password=settings.SSH_PASSWORD,
                known_hosts=None,
                keepalive_interval=30,
            )
        return self._conn

    async def run_command(self, command: str) -> str:
        if settings.SSH_MOCK:
            logger.info("[SSH_MOCK] run_command(%r) — пропущено", command)
            return ""

        async with asyncssh.connect(
            settings.SSH_HOST,
            username=settings.SSH_USERNAME,
            password=settings.SSH_PASSWORD,
            known_hosts=None,
        ) as conn:
            result = await conn.run(command, check=True)
            return result.stdout

    async def upload_file(self, local_path: str, remote_path: str) -> None:
        if settings.SSH_MOCK:
            logger.info("[SSH_MOCK] upload_file(%s -> %s) — копирую в mock-хранилище вместо реального SSH", local_path, remote_path)
            Path(remote_path).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(local_path, remote_path)
            return

        async with asyncssh.connect(
            settings.SSH_HOST,
            username=settings.SSH_USERNAME,
            password=settings.SSH_PASSWORD,
            known_hosts=None,
        ) as conn:
            async with conn.start_sftp_client() as sftp:
                await sftp.put(local_path, remote_path)

    async def remove_file(self, remote_path: str) -> None:
        if settings.SSH_MOCK:
            logger.info("[SSH_MOCK] remove_file(%s) — удаляю из mock-хранилища", remote_path)
            Path(remote_path).unlink(missing_ok=True)
            return

        async with asyncssh.connect(
            settings.SSH_HOST,
            username=settings.SSH_USERNAME,
            password=settings.SSH_PASSWORD,
            known_hosts=None,
        ) as conn:
            async with conn.start_sftp_client() as sftp:
                await sftp.remove(remote_path)

    async def close(self) -> None:
        if self._conn:
            self._conn.close()
            await self._conn.wait_closed()

    async def download_file(self, remote_path: str, local_path: str) -> None:
        if settings.SSH_MOCK:
            logger.info("[SSH_MOCK] download_file(%s -> %s) — копирую из mock-хранилища", remote_path, local_path)
            try:
                shutil.copyfile(remote_path, local_path)
            except OSError:
                logger.warning("[SSH_MOCK] не удалось скопировать %s, файл не найден", remote_path)
            return

        conn = await self._get_connection()
        async with conn.start_sftp_client() as sftp:
            await sftp.get(remote_path, local_path)