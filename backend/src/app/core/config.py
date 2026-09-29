from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration, loaded from environment variables and an optional .env file."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "ClientFlow CRM API"
    environment: str = "development"
    database_url: str = "sqlite:///./clientflow.local.db"

    secret_key: str = "dev-only-insecure-secret-change-me"
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


@lru_cache
def get_settings() -> Settings:
    return Settings()
