from app.core.config import Settings, get_settings
from app.providers.base import LLMProvider
from app.providers.errors import LLMProviderError
from app.providers.mock_provider import MockProvider
from app.providers.openai_provider import OpenAIProvider


def get_llm_provider(settings: Settings | None = None) -> LLMProvider:
    """Factory selecting the configured provider. Defaults to the offline mock."""
    settings = settings or get_settings()
    if settings.llm_provider == "openai":
        if not settings.openai_api_key:
            raise LLMProviderError(
                "LLM_PROVIDER is 'openai' but OPENAI_API_KEY is not configured"
            )
        return OpenAIProvider(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
            base_url=settings.openai_base_url,
            timeout_seconds=settings.openai_timeout_seconds,
            max_retries=settings.openai_max_retries,
            retry_wait_seconds=settings.openai_retry_wait_seconds,
        )
    return MockProvider()


__all__ = ["LLMProvider", "MockProvider", "OpenAIProvider", "get_llm_provider"]
