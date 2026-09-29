from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import Company
from app.repositories.base import contains
from app.schemas.params import CompanyListParams


def get(db: Session, company_id: str) -> Company | None:
    return db.get(Company, company_id)


def get_by_name(db: Session, name: str, *, exclude_id: str | None = None) -> Company | None:
    stmt = select(Company).where(func.lower(Company.name) == name.strip().lower())
    if exclude_id:
        stmt = stmt.where(Company.id != exclude_id)
    return db.scalars(stmt).first()


def list_companies(db: Session, params: CompanyListParams) -> tuple[list[Company], int]:
    stmt = select(Company).where(Company.archived_at.is_(None))
    if params.search:
        term = contains(params.search)
        stmt = stmt.where(or_(Company.name.ilike(term, escape="\\"), Company.email.ilike(term, escape="\\")))
    if params.industry:
        stmt = stmt.where(func.lower(Company.industry) == params.industry.strip().lower())

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    sort_col = getattr(Company, params.sort_by)
    stmt = stmt.order_by(sort_col.desc() if params.order == "desc" else sort_col.asc())
    stmt = stmt.offset((params.page - 1) * params.page_size).limit(params.page_size)
    return list(db.scalars(stmt)), int(total)


def count_active(db: Session) -> int:
    return int(
        db.scalar(select(func.count()).where(Company.archived_at.is_(None))) or 0
    )
