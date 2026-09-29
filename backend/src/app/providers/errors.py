"""Errors raised by LLM providers. Never retried blindly; mapped to safe API responses."""


class LLMProviderError(Exception):
    """Base class for provider failures (network, 5xx, rate limit, malformed output)."""


class LLMProviderAuthError(LLMProviderError):
    """Authentication/authorization failure at the provider - must not be retried."""


class LLMProviderResponseError(LLMProviderError):
    """The provider replied but the response was unusable (bad JSON, schema mismatch)."""
