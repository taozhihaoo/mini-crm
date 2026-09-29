from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.brief import ActivityBrief, TaskBrief
from app.schemas.common import Page
from app.schemas.lead import (
    LeadCreate,
    LeadDetail,
    LeadRead,
    LeadStageUpdate,
    LeadUpdate,
)
from app.schemas.params import LeadListParams
from app.services import lead_service

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("", response_model=Page[LeadRead])
def list_leads(
    params: LeadListParams = Depends(),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> Page[LeadRead]:
    leads, total = lead_service.list_leads(db, params)
    return Page(
        items=[LeadRead.model_validate(lead) for lead in leads],
        total=total,
        page=params.page,
        page_size=params.page_size,
    )


@router.post("", response_model=LeadRead, status_code=status.HTTP_201_CREATED)
def create_lead(
    data: LeadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return lead_service.create_lead(db, data, current_user)


@router.get("/{lead_id}", response_model=LeadDetail)
def get_lead(
    lead_id: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> LeadDetail:
    lead, activities, tasks = lead_service.get_lead_detail(db, lead_id)
    detail = LeadDetail.model_validate(lead)  # company/contact/owner come from relationships
    detail.activities = [ActivityBrief.model_validate(a) for a in activities]
    detail.tasks = [TaskBrief.model_validate(t) for t in tasks]
    return detail


@router.patch("/{lead_id}", response_model=LeadRead)
def update_lead(
    lead_id: str,
    data: LeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return lead_service.update_lead(db, lead_id, data, current_user)


@router.patch("/{lead_id}/stage", response_model=LeadRead)
def change_stage(
    lead_id: str,
    data: LeadStageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return lead_service.change_stage(db, lead_id, data.stage, current_user)


@router.post("/{lead_id}/archive", response_model=LeadRead)
def archive_lead(
    lead_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return lead_service.archive_lead(db, lead_id, current_user)


@router.post("/{lead_id}/unarchive", response_model=LeadRead)
def unarchive_lead(
    lead_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return lead_service.unarchive_lead(db, lead_id, current_user)
