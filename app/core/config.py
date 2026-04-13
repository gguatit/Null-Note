import sys
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "NullNote"
    secret_key: str = "change-this-secret-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/nullnote"
    cors_origins: str = "*"
    upload_dir: str = str(Path(__file__).resolve().parent.parent.parent / "uploads")

    def check_production_safety(self) -> None:
        if self.secret_key == "change-this-secret-in-production":
            print(
                "[FATAL] SECRET_KEY is set to the default value. "
                "Set a secure SECRET_KEY in your .env file.",
                file=sys.stderr,
            )
            sys.exit(1)


settings = Settings()