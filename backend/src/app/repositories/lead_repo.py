from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import Lead
from app.models.enums import LeadPriority, LeadStage
from app.repositories.base import contains
from app.schemas.params import LeadListParams


def get(db: Session, lead_id: str) -> Lead | None:
    return db.get(Lead, lead_id)


def list_leads(db: Session, params: LeadListParams) -> tuple[list[Lead], int]:
    stmt = select(Lead).where(Lead.archived_at.is_(None))
    if params.search:
        term = contains(params.search)
        stmt = stmt.where(
            or_(Lead.title.ilike(term, escape="\\"), Lead.description.ilike(term, escape="\\"))
        )
    if params.stage:
        stmt = stmt.where(Lead.stage == LeadStage(params.stage))
    if params.priority:
        stmt = stmt.where(Lead.priority == LeadPriority(params.priority))
    if params.owner_id:
        stmt = stmt.where(Lead.owner_id == params.owner_id)
    if params.company_id:
        stmt = stmt.where(Lead.company_id == params.company_id)
    if params.contact_id:
        stmt = stmt.where(Lead.contact_id == params.contact_id)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    sort_col = getattr(Lead, params.sort_by)
    stmt = stmt.order_by(sort_col.desc() if params.order == "desc" else sort_col.asc())
    stmt = stmt.offset((params.page - 1) * params.page_size).limit(params.page_size)
    return list(db.scalars(stmt)), int(total)


def list_by_stage(db: Session, stage: LeadStage) -> list[Lead]:
    stmt = select(Lead).where(Lead.stage == stage, Lead.archived_at.is_(None))
    return list(db.scalars(stmt))


def sum_value_by_stage(db: Session) -> dict[LeadStage, tuple[int, Decimal]]:
    """Aggregate lead count and total value per stage (active leads only)."""
    rows = db.execute(
        select(Lead.stage, func.count(), func.coalesce(func.sum(Lead.value), 0))
        .where(Lead.archived_at.is_(None))
        .group_by(Lead.stage)
    ).all()
    return {stage: (count, Decimal(total)) for stage, count, total in rows}
