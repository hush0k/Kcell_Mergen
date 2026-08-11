from pathlib import Path

from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str
    POSTGRES_PORT: int
    POSTGRES_SCHEMA: str = "public"

    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 100 * 12 * 30 * 24 * 60  # 100 лет в минутах

    MFS_DATABASE_URL: str
    MFS_BLACKLIST_AUTHOR: str = "app_fraud"

    ATTACHMENTS_DIR: Path = Path(BASE_DIR, "storage", "attachments")

    # Atlas (CODA) — сторонний сервис, переподключается независимо от MFS.
    ATLAS_API_BASE_URL: str = "https://atlas-customers-api.atlas.kcell.kz"
    ATLAS_USER: str = ""
    ATLAS_PASSWORD: str = ""
    ATLAS_VERIFY_SSL: bool = False
    ATLAS_NOTE_DELAY_SEC: float = 1
    ATLAS_REQUEST_TIMEOUT: int = 60
    ATLAS_GET_CLNT_FN: str = "get_clnt_by_msisdn"
    ATLAS_GET_CLNT_SCHEMA: str = "app_fraud"

    @property
    def BASE_DIR(self) -> Path:
        return BASE_DIR

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    model_config = {"env_file": ".env"}


settings = Settings()
