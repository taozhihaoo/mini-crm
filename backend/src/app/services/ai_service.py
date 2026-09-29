"""AI orchestration: assembles lead context, delegates to the configured provider,
validates structured output, and audits every AI action."""

from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.exceptions import AIProviderError, NotFoundError
from app.models import Activity, Lead, User
from app.providers import LLMProvider
from app.providers.base import ActivityContextItem, LeadContext
from app.providers.errors import LLMProviderError
from app.schemas.ai import FollowUpDraftResult, LeadPriorityResult, LeadSummaryResult
from app.services import audit_service

RECENT_ACTIVITY_LIMIT = 10


def _iso(value: datetime | None) -> str:
    if value is None:
        return ""
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).date().isoformat()


def build_lead_context(db: Session, lead: Lead) -> LeadContext:
    activities = (
        db.query(Activity)
        .filter(Activity.lead_id == lead.id)
        .order_by(Activity.occurred_at.desc())
        .limit(RECENT_ACTIVITY_LIMIT)
        .all()
    )
    items = [
        ActivityContextItem(
            type=a.type.value,
            subject=a.subject,
            occurred_at=_iso(a.occurred_at),
        )
        for a in activities
    ]
    return LeadContext(
        lead_id=lead.id,
        title=lead.title,
        description=lead.description or "",
        stage=lead.stage.value,
        priority=lead.priority.value,
        value=str(Decimal(lead.value).quantize(Decimal("0.01"))),
        currency=lead.currency,
        source=lead.source.value,
        expected_close_date=lead.expected_close_date.isoformat() if lead.expected_close_date else "",
        company_name=lead.company.name if lead.company else "",
        company_industry=lead.company.industry or "" if lead.company else "",
        contact_name=f"{lead.contact.first_name} {lead.contact.last_name}" if lead.contact else "",
        contact_email=lead.contact.email if lead.contact else "",
        contact_job_title=lead.contact.job_title or "" if lead.contact else "",
        owner_name=lead.owner.full_name if lead.owner else "",
        activities=items,
    )


def _translated(exc: LLMProviderError) -> AIProviderError:
    return AIProviderError(str(exc))


class AIService:
    def __init__(self, provider: LLMProvider) -> None:
        self.provider = provider

    def summarize_lead(self, db: Session, lead_id: str, actor: User) -> LeadSummaryResult:
        lead = db.get(Lead, lead_id)
        if lead is None:
            raise NotFoundError("Lead not found")
        context = build_lead_context(db, lead)
        try:
            result = self.provider.summarize_lead(context)
        except LLMProviderError as exc:
            raise _translated(exc) from exc
        self._audit(
            db, actor, lead, "ai.summary",
            {"provider": self.provider.name, "usage": result.usage},
        )
        return result

    def prioritize_lead(self, db: Session, lead_id: str, actor: User) -> LeadPriorityResult:
        lead = db.get(Lead, lead_id)
        if lead is None:
            raise NotFoundError("Lead not found")
        context = build_lead_context(db, lead)
        try:
            result = self.provider.prioritize_lead(context)
        except LLMProviderError as exc:
            raise _translated(exc) from exc
        self._audit(
            db,
            actor,
            lead,
            "ai.priority",
            {
                "provider": self.provider.name,
                "suggested": result.priority.value,
                "usage": result.usage,
            },
        )
        return result

    def draft_follow_up(self, db: Session, lead_id: str, actor: User) -> FollowUpDraftResult:
        lead = db.get(Lead, lead_id)
        if lead is None:
            raise NotFoundError("Lead not found")
        context = build_lead_context(db, lead)
        try:
            result = self.provider.draft_follow_up(context)
        except LLMProviderError as exc:
            raise _translated(exc) from exc
        self._audit(
            db, actor, lead, "ai.follow_up_draft",
            {"provider": self.provider.name, "usage": result.usage},
        )
        return result

    def _audit(self, db: Session, actor: User, lead: Lead, action: str, meta: dict) -> None:
        audit_service.log(
            db,
            actor=actor,
            action=action,
            entity_type="lead",
            entity_id=lead.id,
            meta=meta,
        )
        # AI results are ephemeral suggestions; the audit trail is the persistent record.
        db.commit()
