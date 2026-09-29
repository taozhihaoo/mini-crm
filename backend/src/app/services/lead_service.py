from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.models import Activity, Lead, Task, User
from app.models.enums import LeadStage
from app.repositories import company_repo, contact_repo, lead_repo, user_repo
from app.schemas.lead import LeadCreate, LeadUpdate
from app.schemas.params import LeadListParams
from app.services import audit_service

# Explicit sales workflow: Won is terminal; Lost can be reopened.
ALLOWED_STAGE_TRANSITIONS: dict[LeadStage, set[LeadStage]] = {
    LeadStage.new: {LeadStage.qualified, LeadStage.lost},
    LeadStage.qualified: {LeadStage.new, LeadStage.proposal, LeadStage.lost},
    LeadStage.proposal: {LeadStage.qualified, LeadStage.negotiation, LeadStage.lost},
    LeadStage.negotiation: {LeadStage.proposal, LeadStage.won, LeadStage.lost},
    LeadStage.won: set(),
    LeadStage.lost: {LeadStage.new},
}


def list_leads(db: Session, params: LeadListParams) -> tuple[list[Lead], int]:
    return lead_repo.list_leads(db, params)


def _validate_references(
    db: Session,
    *,
    company_id: str,
    contact_id: str,
    owner_id: str | None,
) -> str:
    """Validate lead references and return the resolved owner id check outcome."""
    if company_repo.get(db, company_id) is None:
        raise BusinessRuleError("Company does not exist")
    contact = contact_repo.get(db, contact_id)
    if contact is None:
        raise BusinessRuleError("Contact does not exist")
    if contact.company_id != company_id:
        raise BusinessRuleError("Contact does not belong to the selected company")
    if owner_id is not None and user_repo.get(db, owner_id) is None:
        raise BusinessRuleError("Owner does not exist")
    return owner_id or ""


def create_lead(db: Session, data: LeadCreate, actor: User) -> Lead:
    _validate_references(
        db, company_id=data.company_id, contact_id=data.contact_id, owner_id=data.owner_id
    )
    owner_id = data.owner_id or actor.id

    lead = Lead(**data.model_dump(exclude={"owner_id"}), owner_id=owner_id)
    db.add(lead)
    db.flush()
    audit_service.log(
        db,
        actor=actor,
        action="lead.created",
        entity_type="lead",
        entity_id=lead.id,
        meta={"stage": lead.stage.value, "value": str(lead.value)},
    )
    db.commit()
    return lead


def get_lead(db: Session, lead_id: str) -> Lead:
    lead = lead_repo.get(db, lead_id)
    if lead is None:
        raise NotFoundError("Lead not found")
    return lead


def get_lead_detail(db: Session, lead_id: str) -> tuple[Lead, list[Activity], list[Task]]:
    lead = get_lead(db, lead_id)
    activities = (
        db.query(Activity)
        .filter(Activity.lead_id == lead_id)
        .order_by(Activity.occurred_at.desc())
        .limit(50)
        .all()
    )
    tasks = (
        db.query(Task)
        .filter(Task.related_lead_id == lead_id)
        .order_by(Task.created_at.desc())
        .limit(20)
        .all()
    )
    return lead, list(activities), list(tasks)


def update_lead(db: Session, lead_id: str, data: LeadUpdate, actor: User) -> Lead:
    lead = get_lead(db, lead_id)
    changes = data.model_dump(exclude_unset=True)

    if "company_id" in changes or "contact_id" in changes:
        _validate_references(
            db,
            company_id=changes.get("company_id", lead.company_id),
            contact_id=changes.get("contact_id", lead.contact_id),
            owner_id=None,
        )
    if "owner_id" in changes and user_repo.get(db, changes["owner_id"]) is None:
        raise BusinessRuleError("Owner does not exist")

    for field, value in changes.items():
        setattr(lead, field, value)

    audit_service.log(
        db,
        actor=actor,
        action="lead.updated",
        entity_type="lead",
        entity_id=lead.id,
        meta={"changed": list(changes.keys())},
    )
    db.commit()
    return lead


def change_stage(db: Session, lead_id: str, new_stage: LeadStage, actor: User) -> Lead:
    lead = get_lead(db, lead_id)
    if lead.archived_at is not None:
        raise BusinessRuleError("Archived leads cannot be moved between stages")

    # Dropping a card back onto its own column is a no-op, not an error.
    if new_stage == lead.stage:
        return lead

    allowed = ALLOWED_STAGE_TRANSITIONS[lead.stage]
    if new_stage not in allowed:
        raise BusinessRuleError(
            f"Cannot move a lead from '{lead.stage.value}' to '{new_stage.value}'. "
            f"Allowed next stages: {sorted(s.value for s in allowed) or 'none (terminal stage)'}"
        )

    old_stage = lead.stage
    lead.stage = new_stage
    audit_service.log(
        db,
        actor=actor,
        action="lead.stage_changed",
        entity_type="lead",
        entity_id=lead.id,
        meta={"from": old_stage.value, "to": new_stage.value},
    )
    db.commit()
    return lead


def archive_lead(db: Session, lead_id: str, actor: User) -> Lead:
    lead = get_lead(db, lead_id)
    if lead.archived_at is not None:
        raise BusinessRuleError("Lead is already archived")

    lead.archived_at = datetime.now(UTC)
    audit_service.log(db, actor=actor, action="lead.archived", entity_type="lead", entity_id=lead.id)
    db.commit()
    return lead


def unarchive_lead(db: Session, lead_id: str, actor: User) -> Lead:
    lead = get_lead(db, lead_id)
    if lead.archived_at is None:
        raise BusinessRuleError("Lead is not archived")

    lead.archived_at = None
    audit_service.log(
        db, actor=actor, action="lead.unarchived", entity_type="lead", entity_id=lead.id
    )
    db.commit()
    return lead
