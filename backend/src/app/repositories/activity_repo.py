from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Activity
from app.models.enums import ActivityType
from app.schemas.params import ActivityListParams


def get(db: Session, activity_id: str) -> Activity | None:
    return db.get(Activity, activity_id)


def list_activities(db: Session, params: ActivityListParams) -> tuple[list[Activity], int]:
    stmt = select(Activity)
    if params.lead_id:
        stmt = stmt.where(Activity.lead_id == params.lead_id)
    if params.contact_id:
        stmt = stmt.where(Activity.contact_id == params.contact_id)
    if params.company_id:
        stmt = stmt.where(Activity.company_id == params.company_id)
    if params.type:
        stmt = stmt.where(Activity.type == ActivityType(params.type))

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    sort_col = getattr(Activity, params.sort_by)
    stmt = stmt.order_by(sort_col.desc() if params.order == "desc" else sort_col.asc())
    stmt = stmt.offset((params.page - 1) * params.page_size).limit(params.page_size)
    return list(db.scalars(stmt)), int(total)


def recent(db: Session, limit: int = 8) -> list[Activity]:
    stmt = select(Activity).order_by(Activity.occurred_at.desc()).limit(limit)
    return list(db.scalars(stmt))
