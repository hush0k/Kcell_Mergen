from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str
    POSTGRES_PORT: int

    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 100 * 12 * 30 * 24 * 60  # 100 лет в минутах

    @property
    def jwt_secret_key(self) -> str:
        return self.SECRET_KEY

    @property
    def jwt_algorithm(self) -> str:
        return self.ALGORITHM

    @property
    def jwt_access_token_expire_minutes(self) -> int:
        return self.ACCESS_TOKEN_EXPIRE_MINUTES

    @property
    def jwt_refresh_token_expire_minutes(self) -> int:
        return self.REFRESH_TOKEN_EXPIRE_MINUTES

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    model_config = {"env_file": ".env"}


settings = Settings()
