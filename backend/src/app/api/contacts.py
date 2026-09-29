from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.brief import ActivityBrief, LeadBrief, TaskBrief
from app.schemas.common import Page
from app.schemas.contact import ContactCreate, ContactDetail, ContactRead, ContactUpdate
from app.schemas.params import ContactListParams
from app.services import contact_service

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=Page[ContactRead])
def list_contacts(
    params: ContactListParams = Depends(),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> Page[ContactRead]:
    contacts, total = contact_service.list_contacts(db, params)
    return Page(
        items=[ContactRead.model_validate(c) for c in contacts],
        total=total,
        page=params.page,
        page_size=params.page_size,
    )


@router.post("", response_model=ContactRead, status_code=status.HTTP_201_CREATED)
def create_contact(
    data: ContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return contact_service.create_contact(db, data, current_user)


@router.get("/{contact_id}", response_model=ContactDetail)
def get_contact(
    contact_id: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> ContactDetail:
    contact, leads, activities, tasks = contact_service.get_contact_detail(db, contact_id)
    detail = ContactDetail.model_validate(contact)  # company comes from the relationship
    detail.leads = [LeadBrief.model_validate(lead) for lead in leads]
    detail.activities = [ActivityBrief.model_validate(a) for a in activities]
    detail.tasks = [TaskBrief.model_validate(t) for t in tasks]
    return detail


@router.patch("/{contact_id}", response_model=ContactRead)
def update_contact(
    contact_id: str,
    data: ContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return contact_service.update_contact(db, contact_id, data, current_user)


@router.post("/{contact_id}/archive", response_model=ContactRead)
def archive_contact(
    contact_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return contact_service.archive_contact(db, contact_id, current_user)


@router.post("/{contact_id}/unarchive", response_model=ContactRead)
def unarchive_contact(
    contact_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return contact_service.unarchive_contact(db, contact_id, current_user)
