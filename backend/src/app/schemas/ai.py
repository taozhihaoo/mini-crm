from pydantic import BaseModel, Field

from app.models.enums import LeadPriority


class LeadSummaryResult(BaseModel):
    """Structured output required from the LLM for lead summaries."""

    summary: str = Field(min_length=1)


class LeadPriorityResult(BaseModel):
    """Structured output required from the LLM for lead prioritization."""

    priority: LeadPriority
    reasoning: str = Field(min_length=1)


class FollowUpDraftResult(BaseModel):
    """Structured output required from the LLM for follow-up drafts."""

    subject: str = Field(min_length=1)
    body: str = Field(min_length=1)


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
