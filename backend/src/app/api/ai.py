from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.exceptions import AIProviderError
from app.db.session import get_db
from app.models import User
from app.providers import get_llm_provider
from app.providers.errors import LLMProviderError
from app.schemas.ai import AIFollowUpResponse, AIPriorityResponse, AISummaryResponse
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["ai"])


def get_ai_service() -> AIService:
    try:
        provider = get_llm_provider()
    except LLMProviderError as exc:
        raise AIProviderError(str(exc)) from exc
    return AIService(provider)


@router.post("/leads/{lead_id}/summary", response_model=AISummaryResponse)
def lead_summary(
    lead_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    ai: AIService = Depends(get_ai_service),
) -> AISummaryResponse:
    result = ai.summarize_lead(db, lead_id, current_user)
    return AISummaryResponse(summary=result.summary, provider=ai.provider.name)


@router.post("/leads/{lead_id}/priority", response_model=AIPriorityResponse)
def lead_priority(
    lead_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    ai: AIService = Depends(get_ai_service),
) -> AIPriorityResponse:
    result = ai.prioritize_lead(db, lead_id, current_user)
    return AIPriorityResponse(
        priority=result.priority, reasoning=result.reasoning, provider=ai.provider.name
    )


@router.post("/leads/{lead_id}/follow-up", response_model=AIFollowUpResponse)
def lead_follow_up(
    lead_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    ai: AIService = Depends(get_ai_service),
) -> AIFollowUpResponse:
    result = ai.draft_follow_up(db, lead_id, current_user)
    return AIFollowUpResponse(
        subject=result.subject, body=result.body, provider=ai.provider.name
    )
