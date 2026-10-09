from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="ALSVID_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: str = "development"
    host: str = "127.0.0.1"
    port: int = 8200
    database_url: str = "postgresql+psycopg://alsvid:alsvid@127.0.0.1:5432/alsvid"

    r2_endpoint_url: str | None = None
    r2_bucket: str | None = None
    r2_access_key_id: str | None = None
    r2_secret_access_key: str | None = None
    r2_public_base_url: str | None = None

    @property
    def is_production(self) -> bool:
        return self.environment.strip().lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
