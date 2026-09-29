from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, ConflictError, NotFoundError
from app.models import Activity, Contact, Lead, Task, User
from app.repositories import company_repo, contact_repo
from app.schemas.contact import ContactCreate, ContactUpdate
from app.schemas.params import ContactListParams
from app.services import audit_service


def list_contacts(db: Session, params: ContactListParams) -> tuple[list[Contact], int]:
    return contact_repo.list_contacts(db, params)


def validate_company_exists(db: Session, company_id: str) -> None:
    if company_repo.get(db, company_id) is None:
        raise BusinessRuleError("Company does not exist")


def create_contact(db: Session, data: ContactCreate, actor: User) -> Contact:
    validate_company_exists(db, data.company_id)
    if contact_repo.get_by_email(db, data.email) is not None:
        raise ConflictError("A contact with this email already exists")

    contact = Contact(**data.model_dump())
    db.add(contact)
    db.flush()
    audit_service.log(
        db, actor=actor, action="contact.created", entity_type="contact", entity_id=contact.id
    )
    db.commit()
    return contact


def get_contact(db: Session, contact_id: str) -> Contact:
    contact = contact_repo.get(db, contact_id)
    if contact is None:
        raise NotFoundError("Contact not found")
    return contact


def get_contact_detail(db: Session, contact_id: str) -> tuple[Contact, list[Lead], list[Activity], list[Task]]:
    contact = get_contact(db, contact_id)
    leads = (
        db.query(Lead)
        .filter(Lead.contact_id == contact_id, Lead.archived_at.is_(None))
        .order_by(Lead.created_at.desc())
        .limit(20)
        .all()
    )
    activities = (
        db.query(Activity)
        .filter(Activity.contact_id == contact_id)
        .order_by(Activity.occurred_at.desc())
        .limit(20)
        .all()
    )
    tasks = (
        db.query(Task)
        .filter(Task.related_contact_id == contact_id)
        .order_by(Task.created_at.desc())
        .limit(20)
        .all()
    )
    return contact, list(leads), list(activities), list(tasks)


def update_contact(db: Session, contact_id: str, data: ContactUpdate, actor: User) -> Contact:
    contact = get_contact(db, contact_id)
    changes = data.model_dump(exclude_unset=True)

    if "company_id" in changes:
        validate_company_exists(db, changes["company_id"])
    if "email" in changes and contact_repo.get_by_email(
        db, changes["email"], exclude_id=contact.id
    ):
        raise ConflictError("A contact with this email already exists")

    for field, value in changes.items():
        setattr(contact, field, value)

    audit_service.log(
        db,
        actor=actor,
        action="contact.updated",
        entity_type="contact",
        entity_id=contact.id,
        meta={"changed": list(changes.keys())},
    )
    db.commit()
    return contact


def archive_contact(db: Session, contact_id: str, actor: User) -> Contact:
    contact = get_contact(db, contact_id)
    if contact.archived_at is not None:
        raise ConflictError("Contact is already archived")

    contact.archived_at = datetime.now(UTC)
    audit_service.log(
        db, actor=actor, action="contact.archived", entity_type="contact", entity_id=contact.id
    )
    db.commit()
    return contact


def unarchive_contact(db: Session, contact_id: str, actor: User) -> Contact:
    contact = get_contact(db, contact_id)
    if contact.archived_at is None:
        raise ConflictError("Contact is not archived")

    contact.archived_at = None
    audit_service.log(
        db, actor=actor, action="contact.unarchived", entity_type="contact", entity_id=contact.id
    )
    db.commit()
    return contact
