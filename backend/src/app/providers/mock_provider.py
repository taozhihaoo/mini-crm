"""Deterministic offline mock provider.

Produces stable, plausible outputs for every lead with no network access and
no API key, so the entire product (and its demo mode) works out of the box.
The same lead context always yields the same result.
"""

from typing import ClassVar

from app.providers.base import LeadContext, LLMProvider
from app.schemas.ai import FollowUpDraftResult, LeadPriorityResult, LeadSummaryResult

_VALUE_TIER_HIGH = 40000
_VALUE_TIER_MEDIUM = 10000
_RECENT_ACTIVITY_STAGES = {"proposal", "negotiation", "qualified"}


class MockProvider(LLMProvider):
    name: ClassVar[str] = "mock"

    def summarize_lead(self, context: LeadContext) -> LeadSummaryResult:
        stage_label = context.stage.replace("_", " ").title()
        parts = [
            f"{context.title} is a {stage_label} opportunity with {context.company_name}"
            f" ({context.company_industry or 'industry unknown'}).",
            f"The deal is valued at {context.currency} {context.value} with {context.priority}"
            f" priority, owned by {context.owner_name}.",
        ]
        if context.activities:
            latest = context.activities[0]
            parts.append(
                f"The most recent touchpoint was a {latest.type} ('{latest.subject}') "
                f"on {latest.occurred_at[:10]}, out of {len(context.activities)} logged activities."
            )
        else:
            parts.append("No activities have been logged yet for this lead.")
        if context.expected_close_date:
            parts.append(f"Target close date is {context.expected_close_date}.")
        else:
            parts.append("No expected close date has been set yet.")

        return LeadSummaryResult(summary=" ".join(parts))

    def prioritize_lead(self, context: LeadContext) -> LeadPriorityResult:
        score = 0
        reasons: list[str] = []

        value = float(context.value or 0)
        if value >= _VALUE_TIER_HIGH:
            score += 2
            reasons.append(f"deal value {context.currency} {context.value} is substantial")
        elif value >= _VALUE_TIER_MEDIUM:
            score += 1
            reasons.append(f"deal value {context.currency} {context.value} is moderate")

        if context.stage in {"proposal", "negotiation"}:
            score += 2
            reasons.append(f"the deal is already at {context.stage} stage")
        elif context.stage in _RECENT_ACTIVITY_STAGES:
            score += 1

        if context.activities:
            score += 1
            reasons.append(f"{len(context.activities)} recent activities show engagement")
        else:
            reasons.append("no recent activities have been logged")

        if context.priority == "high":
            score += 1

        priority = "high" if score >= 4 else "medium" if score >= 2 else "low"
        reasoning = (
            "Mock assessment: " + "; ".join(reasons) + f" (score {score})."
        )
        return LeadPriorityResult(priority=priority, reasoning=reasoning)  # type: ignore[arg-type]

    def draft_follow_up(self, context: LeadContext) -> FollowUpDraftResult:
        first_name = context.contact_name.split(" ")[0] if context.contact_name else "there"
        subject = f"Following up on {context.title}"

        if context.activities:
            latest = context.activities[0]
            opener = (
                f"Hi {first_name}, thank you for the {latest.type} earlier "
                f"('{latest.subject}')."
            )
        else:
            opener = f"Hi {first_name}, I wanted to reach out regarding {context.title}."

        body = "\n".join(
            [
                opener,
                "",
                (
                    f"We're excited about the opportunity to help {context.company_name} "
                    f"with {context.title}"
                    + (f" - the proposal of {context.currency} {context.value}" if float(context.value or 0) else "")
                    + "."
                ),
                "",
                (
                    "Could we schedule a short call this week to align on next steps "
                    "and answer any open questions?"
                ),
                "",
                "Best regards,",
                context.owner_name,
            ]
        )
        return FollowUpDraftResult(subject=subject, body=body)
