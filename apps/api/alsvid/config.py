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

    session_cookie_name: str = "alsvid_session"
    session_ttl_hours: int = 12
    session_cookie_secure: bool = False
    password_min_length: int = 12
    auth_lockout_attempts: int = 5
    auth_lockout_minutes: int = 15

    r2_endpoint_url: str | None = None
    r2_bucket: str | None = None
    r2_access_key_id: str | None = None
    r2_secret_access_key: str | None = None
    r2_public_base_url: str | None = None
    r2_region: str = "auto"
    r2_presign_seconds: int = 900

    @property
    def is_production(self) -> bool:
        return self.environment.strip().lower() == "production"

    @property
    def secure_session_cookie(self) -> bool:
        return self.session_cookie_secure or self.is_production


@lru_cache
def get_settings() -> Settings:
    return Settings()
