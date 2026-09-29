from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models import Company, Contact, Lead, User
from app.repositories import company_repo
from app.schemas.company import CompanyCreate, CompanyUpdate
from app.schemas.params import CompanyListParams
from app.services import audit_service


def list_companies(db: Session, params: CompanyListParams) -> tuple[list[Company], int]:
    return company_repo.list_companies(db, params)


def create_company(db: Session, data: CompanyCreate, actor: User) -> Company:
    if company_repo.get_by_name(db, data.name) is not None:
        raise ConflictError("A company with this name already exists")

    company = Company(**data.model_dump())
    db.add(company)
    db.flush()
    audit_service.log(
        db, actor=actor, action="company.created", entity_type="company", entity_id=company.id
    )
    db.commit()
    return company


def get_company(db: Session, company_id: str) -> Company:
    company = company_repo.get(db, company_id)
    if company is None:
        raise NotFoundError("Company not found")
    return company


def get_company_detail(db: Session, company_id: str) -> tuple[Company, list[Contact], list[Lead]]:
    company = get_company(db, company_id)
    contacts = list(
        db.query(Contact)
        .filter(Contact.company_id == company_id, Contact.archived_at.is_(None))
        .order_by(Contact.created_at.desc())
        .limit(20)
    )
    leads = list(
        db.query(Lead)
        .filter(Lead.company_id == company_id, Lead.archived_at.is_(None))
        .order_by(Lead.created_at.desc())
        .limit(20)
    )
    return company, contacts, leads


def update_company(db: Session, company_id: str, data: CompanyUpdate, actor: User) -> Company:
    company = get_company(db, company_id)
    changes = data.model_dump(exclude_unset=True)

    if "name" in changes and company_repo.get_by_name(db, changes["name"], exclude_id=company.id):
        raise ConflictError("A company with this name already exists")

    for field, value in changes.items():
        setattr(company, field, value)

    audit_service.log(
        db,
        actor=actor,
        action="company.updated",
        entity_type="company",
        entity_id=company.id,
        meta={"changed": list(changes.keys())},
    )
    db.commit()
    return company


def archive_company(db: Session, company_id: str, actor: User) -> Company:
    company = get_company(db, company_id)
    if company.archived_at is not None:
        raise ConflictError("Company is already archived")

    company.archived_at = datetime.now(UTC)
    audit_service.log(
        db, actor=actor, action="company.archived", entity_type="company", entity_id=company.id
    )
    db.commit()
    return company


def unarchive_company(db: Session, company_id: str, actor: User) -> Company:
    company = get_company(db, company_id)
    if company.archived_at is None:
        raise ConflictError("Company is not archived")

    company.archived_at = None
    audit_service.log(
        db, actor=actor, action="company.unarchived", entity_type="company", entity_id=company.id
    )
    db.commit()
    return company
