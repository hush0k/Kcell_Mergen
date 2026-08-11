from pathlib import Path
from uuid import uuid4

import aiofiles
import magic
from fastapi import UploadFile

from app.core.config import settings

CHUNK_SIZE = 1024 * 1024  # 1MB


async def save_upload_file(file: UploadFile) -> tuple[str, str, int]:
    settings.ATTACHMENTS_DIR.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "").suffix
    stored_name = f"{uuid4().hex}{ext}"
    dest_path = settings.ATTACHMENTS_DIR / stored_name

    size = 0
    detector = magic.Magic(mime=True)
    mime_type = None

    async with aiofiles.open(dest_path, "wb") as out:
        while chunk := await file.read(CHUNK_SIZE):
            if mime_type is None:
                mime_type = detector.from_buffer(chunk)
            size += len(chunk)
            await out.write(chunk)

    return str(dest_path.relative_to(settings.BASE_DIR)), mime_type or (file.content_type or "application/octet-stream"), size


def delete_upload_file(relative_path: str) -> None:
    file_path = settings.BASE_DIR / relative_path
    try:
        file_path.unlink(missing_ok=True)
    except OSError:
        pass
