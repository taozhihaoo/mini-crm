from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

# Any deployment that serves real users must override SECRET_KEY explicitly.
# This default only exists so the project (and its tests) run out of the box.
INSECURE_DEVELOPMENT_SECRET = "dev-only-insecure-secret-change-me"

RuntimeEnvironment = Literal["development", "demo", "production"]


class Settings(BaseSettings):
    """Application configuration, loaded from environment variables and an optional .env file."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "ClientFlow CRM API"
    environment: RuntimeEnvironment = "development"
    database_url: str = "sqlite:///./clientflow.local.db"

    secret_key: str = INSECURE_DEVELOPMENT_SECRET
    access_token_expire_minutes: int = 720  # 12 hours
    jwt_algorithm: str = "HS256"

    cors_origins: str = "http://localhost:5173"

    # AI provider: "mock" (default, fully offline and deterministic) or "openai".
    llm_provider: str = "mock"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_base_url: str = "https://api.openai.com/v1"
    openai_timeout_seconds: float = 45.0
    openai_max_retries: int = 2
    openai_retry_wait_seconds: float = 0.5

    seed_demo_data: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


def validate_runtime_settings(settings: Settings) -> None:
    """Fail fast on unsafe production configuration.

    - production must use an explicitly configured JWT secret (never the
      built-in development default)
    - the fictional demo dataset must never be auto-seeded into production
      (demo data lives in development/demo environments only)
    """
    if settings.environment != "production":
        return
    if settings.secret_key == INSECURE_DEVELOPMENT_SECRET:
        raise RuntimeError(
            "Refusing to start: ENVIRONMENT=production requires an explicit SECRET_KEY "
            "(the built-in development secret is not allowed). "
            "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
        )
    if settings.seed_demo_data:
        raise RuntimeError(
            "Refusing to start: SEED_DEMO_DATA=true is not allowed with ENVIRONMENT=production. "
            "Demo credentials and fictional data must never exist in a production deployment."
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
