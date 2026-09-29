from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.models import Activity, User
from app.repositories import activity_repo, company_repo, contact_repo, lead_repo
from app.schemas.activity import ActivityCreate, ActivityUpdate
from app.schemas.params import ActivityListParams
from app.services import audit_service


def _resolve_links(db: Session, data: ActivityCreate) -> tuple[str | None, str | None, str | None]:
    """Validate linked entities and fill contact/company context from the lead."""
    lead = contact = company = None
    if data.lead_id:
        lead = lead_repo.get(db, data.lead_id)
        if lead is None:
            raise BusinessRuleError("Lead does not exist")
    if data.contact_id:
        contact = contact_repo.get(db, data.contact_id)
        if contact is None:
            raise BusinessRuleError("Contact does not exist")
    if data.company_id:
        company = company_repo.get(db, data.company_id)
        if company is None:
            raise BusinessRuleError("Company does not exist")

    contact_id = data.contact_id or (lead.contact_id if lead else None)
    company_id = data.company_id or (contact.company_id if contact else None) or (
        lead.company_id if lead else None
    )
    return contact_id, company_id, data.lead_id


def create_activity(db: Session, data: ActivityCreate, actor: User) -> Activity:
    contact_id, company_id, lead_id = _resolve_links(db, data)

    occurred_at = data.occurred_at or datetime.now(UTC)
    activity = Activity(
        type=data.type,
        subject=data.subject,
        content=data.content,
        contact_id=contact_id,
        company_id=company_id,
        lead_id=lead_id,
        occurred_at=occurred_at,
    )
    db.add(activity)
    db.flush()
    audit_service.log(
        db,
        actor=actor,
        action="activity.created",
        entity_type="activity",
        entity_id=activity.id,
        meta={"type": activity.type.value},
    )
    db.commit()
    return activity


def list_activities(db: Session, params: ActivityListParams) -> tuple[list[Activity], int]:
    return activity_repo.list_activities(db, params)


def get_activity(db: Session, activity_id: str) -> Activity:
    activity = activity_repo.get(db, activity_id)
    if activity is None:
        raise NotFoundError("Activity not found")
    return activity


def update_activity(db: Session, activity_id: str, data: ActivityUpdate, actor: User) -> Activity:
    activity = get_activity(db, activity_id)
    changes = data.model_dump(exclude_unset=True)

    for field, value in changes.items():
        setattr(activity, field, value)

    audit_service.log(
        db,
        actor=actor,
        action="activity.updated",
        entity_type="activity",
        entity_id=activity.id,
        meta={"changed": list(changes.keys())},
    )
    db.commit()
    return activity
