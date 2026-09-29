from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import ClassVar

from app.schemas.ai import FollowUpDraftResult, LeadPriorityResult, LeadSummaryResult


@dataclass
class ActivityContextItem:
    type: str
    subject: str
    occurred_at: str


@dataclass
class LeadContext:
    """CRM data assembled for one lead. Treated as untrusted content by providers."""

    lead_id: str
    title: str
    description: str
    stage: str
    priority: str
    value: str
    currency: str
    source: str
    expected_close_date: str
    company_name: str
    company_industry: str
    contact_name: str
    contact_email: str
    contact_job_title: str
    owner_name: str
    activities: list[ActivityContextItem] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "lead": {
                "title": self.title,
                "description": self.description,
                "stage": self.stage,
                "priority": self.priority,
                "value": self.value,
                "currency": self.currency,
                "source": self.source,
                "expected_close_date": self.expected_close_date,
            },
            "company": {"name": self.company_name, "industry": self.company_industry},
            "contact": {
                "name": self.contact_name,
                "email": self.contact_email,
                "job_title": self.contact_job_title,
            },
            "owner": self.owner_name,
            "recent_activities": [
                {"type": a.type, "subject": a.subject, "occurred_at": a.occurred_at}
                for a in self.activities
            ],
        }


class LLMProvider(ABC):
    """Provider abstraction. Implementations must return validated structured output."""

    name: ClassVar[str]

    @abstractmethod
    def summarize_lead(self, context: LeadContext) -> LeadSummaryResult: ...

    @abstractmethod
    def prioritize_lead(self, context: LeadContext) -> LeadPriorityResult: ...

    @abstractmethod
    def draft_follow_up(self, context: LeadContext) -> FollowUpDraftResult: ...
