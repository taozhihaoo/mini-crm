"""OpenAI Chat Completions provider.

Uses httpx directly (no heavyweight SDK) so timeouts, retries and error
classification stay explicit. All outputs are validated against strict
Pydantic schemas; any deviation raises LLMProviderResponseError.

Retry policy:
- retried: network errors, timeouts, HTTP 429/500/502/503/504 (bounded)
- never retried: 401/403 (auth), other 4xx, invalid structured output
"""

import json
import time
from typing import ClassVar

import httpx
from pydantic import ValidationError

from app.providers.base import LeadContext, LLMProvider
from app.providers.errors import (
    LLMProviderAuthError,
    LLMProviderError,
    LLMProviderResponseError,
)
from app.providers.prompts import SYSTEM_PROMPTS, build_user_message
from app.schemas.ai import FollowUpDraftResult, LeadPriorityResult, LeadSummaryResult

_RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class OpenAIProvider(LLMProvider):
    name: ClassVar[str] = "openai"

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4o-mini",
        base_url: str = "https://api.openai.com/v1",
        timeout_seconds: float = 45.0,
        max_retries: int = 2,
        retry_wait_seconds: float = 0.5,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.model = model
        self.max_retries = max_retries
        self.retry_wait_seconds = retry_wait_seconds
        self._client = httpx.Client(
            base_url=base_url,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=httpx.Timeout(connect=5.0, read=timeout_seconds, write=10.0, pool=5.0),
            transport=transport,
        )

    def summarize_lead(self, context: LeadContext) -> LeadSummaryResult:
        data, usage = self._complete_json("summary", context)
        result = self._validate(LeadSummaryResult, data)
        result.usage = usage
        return result

    def prioritize_lead(self, context: LeadContext) -> LeadPriorityResult:
        data, usage = self._complete_json("priority", context)
        result = self._validate(LeadPriorityResult, data)
        result.usage = usage
        return result

    def draft_follow_up(self, context: LeadContext) -> FollowUpDraftResult:
        data, usage = self._complete_json("follow_up", context)
        result = self._validate(FollowUpDraftResult, data)
        result.usage = usage
        return result

    # ------------------------------------------------------------------ #

    def _complete_json(self, task: str, context: LeadContext) -> tuple[dict, dict | None]:
        """Run one chat completion task; return (parsed content, provider usage or None)."""
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPTS[task]},
                {"role": "user", "content": build_user_message(context, task)},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }

        last_error: LLMProviderError | None = None
        wait_seconds = self.retry_wait_seconds
        for attempt in range(self.max_retries + 1):
            if attempt > 0:
                time.sleep(wait_seconds)
                wait_seconds *= 2
            try:
                response = self._client.post("/chat/completions", json=payload)
            except httpx.HTTPError as exc:
                last_error = LLMProviderError(f"OpenAI request failed: {exc}")
                continue

            if response.status_code in (401, 403):
                raise LLMProviderAuthError(
                    "OpenAI rejected the API key - check OPENAI_API_KEY"
                )
            if response.status_code in _RETRYABLE_STATUS:
                if response.status_code == 429:
                    retry_after = response.headers.get("Retry-After")
                    if retry_after and retry_after.isdigit():
                        wait_seconds = max(wait_seconds, int(retry_after))
                last_error = LLMProviderError(
                    f"OpenAI returned HTTP {response.status_code}"
                )
                continue
            if response.status_code >= 400:
                raise LLMProviderError(f"OpenAI returned HTTP {response.status_code}")

            try:
                body = response.json()
                content = body["choices"][0]["message"]["content"]
                usage = body.get("usage") if isinstance(body.get("usage"), dict) else None
                return json.loads(content), usage
            except (httpx.HTTPError, KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
                last_error = LLMProviderResponseError(
                    f"OpenAI returned an unreadable response: {exc}"
                )
                continue

        raise last_error or LLMProviderError("OpenAI request failed")

    def _validate(self, model_class, data: dict):
        try:
            return model_class.model_validate(data)
        except ValidationError as exc:
            raise LLMProviderResponseError(
                f"OpenAI response did not match the expected schema: {exc.errors()[0]['msg']}"
            ) from exc
