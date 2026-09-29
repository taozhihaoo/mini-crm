from typing import Any

from pydantic import BaseModel, Field

from app.models.enums import LeadPriority

# Token usage as reported by the provider. Always null when the provider does
# not return usage information (e.g. the offline mock provider) - never guessed.


class LeadSummaryResult(BaseModel):
    """Structured output required from the LLM for lead summaries."""

    summary: str = Field(min_length=1)
    usage: dict[str, Any] | None = None


class LeadPriorityResult(BaseModel):
    """Structured output required from the LLM for lead prioritization."""

    priority: LeadPriority
    reasoning: str = Field(min_length=1)
    usage: dict[str, Any] | None = None


class FollowUpDraftResult(BaseModel):
    """Structured output required from the LLM for follow-up drafts."""

    subject: str = Field(min_length=1)
    body: str = Field(min_length=1)
    usage: dict[str, Any] | None = None


class AISummaryResponse(BaseModel):
    summary: str
    provider: str


class AIPriorityResponse(BaseModel):
    priority: LeadPriority
    reasoning: str
    provider: str


class AIFollowUpResponse(BaseModel):
    subject: str
    body: str
    provider: str
