"""Provider factory tests."""

import pytest

from app.core.config import Settings
from app.providers import get_llm_provider
from app.providers.errors import LLMProviderError
from app.providers.mock_provider import MockProvider
from app.providers.openai_provider import OpenAIProvider


def test_defaults_to_mock_provider():
    settings = Settings(llm_provider="mock", _env_file=None)
    assert isinstance(get_llm_provider(settings), MockProvider)


def test_openai_provider_requires_api_key():
    settings = Settings(llm_provider="openai", openai_api_key="", _env_file=None)
    with pytest.raises(LLMProviderError, match="OPENAI_API_KEY"):
        get_llm_provider(settings)


def test_openai_provider_built_with_key():
    settings = Settings(
        llm_provider="openai",
        openai_api_key="sk-test",
        openai_model="gpt-4o-mini",
        _env_file=None,
    )
    provider = get_llm_provider(settings)
    assert isinstance(provider, OpenAIProvider)
    assert provider.model == "gpt-4o-mini"
