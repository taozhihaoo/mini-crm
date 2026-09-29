"""Tests for runtime configuration guards (production safety rails)."""

import pytest
from pydantic import ValidationError

from app.core.config import INSECURE_DEVELOPMENT_SECRET, Settings, validate_runtime_settings


def test_development_allows_development_secret():
    settings = Settings(environment="development", _env_file=None)
    validate_runtime_settings(settings)  # must not raise


def test_demo_allows_development_secret_and_seed():
    settings = Settings(environment="demo", seed_demo_data=True, _env_file=None)
    validate_runtime_settings(settings)  # must not raise


def test_production_rejects_builtin_development_secret():
    settings = Settings(
        environment="production",
        secret_key=INSECURE_DEVELOPMENT_SECRET,
        _env_file=None,
    )
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        validate_runtime_settings(settings)


def test_production_requires_explicit_secret():
    settings = Settings(
        environment="production",
        secret_key="a-real-explicit-production-secret",
        _env_file=None,
    )
    validate_runtime_settings(settings)  # must not raise


def test_production_rejects_demo_seed():
    settings = Settings(
        environment="production",
        secret_key="a-real-explicit-production-secret",
        seed_demo_data=True,
        _env_file=None,
    )
    with pytest.raises(RuntimeError, match="SEED_DEMO_DATA"):
        validate_runtime_settings(settings)


def test_unknown_environment_is_rejected():
    with pytest.raises(ValidationError):
        Settings(environment="staging", _env_file=None)
