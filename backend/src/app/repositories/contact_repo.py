from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import Contact
from app.repositories.base import contains
from app.schemas.params import ContactListParams


def get(db: Session, contact_id: str) -> Contact | None:
    return db.get(Contact, contact_id)


def get_by_email(db: Session, email: str, *, exclude_id: str | None = None) -> Contact | None:
    stmt = select(Contact).where(func.lower(Contact.email) == email.strip().lower())
    if exclude_id:
        stmt = stmt.where(Contact.id != exclude_id)
    return db.scalars(stmt).first()


def list_contacts(db: Session, params: ContactListParams) -> tuple[list[Contact], int]:
    stmt = select(Contact).where(Contact.archived_at.is_(None))
    if params.search:
        term = contains(params.search)
        stmt = stmt.where(
            or_(
                Contact.first_name.ilike(term, escape="\\"),
                Contact.last_name.ilike(term, escape="\\"),
                Contact.email.ilike(term, escape="\\"),
            )
        )
    if params.company_id:
        stmt = stmt.where(Contact.company_id == params.company_id)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    sort_col = getattr(Contact, params.sort_by)
    stmt = stmt.order_by(sort_col.desc() if params.order == "desc" else sort_col.asc())
    stmt = stmt.offset((params.page - 1) * params.page_size).limit(params.page_size)
    return list(db.scalars(stmt)), int(total)


def count_active(db: Session) -> int:
    return int(
        db.scalar(select(func.count()).select_from(Contact).where(Contact.archived_at.is_(None)))
        or 0
    )
