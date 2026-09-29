from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import AuditLog
from app.schemas.params import AuditLogListParams


def record(
    db: Session,
    *,
    user_id: str | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    meta: dict[str, Any] | None = None,
) -> AuditLog:
    """Create an audit entry in the current transaction (committed by the caller)."""
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        meta=meta,
    )
    db.add(entry)
    return entry


def list_logs(db: Session, params: AuditLogListParams) -> tuple[list[AuditLog], int]:
    stmt = select(AuditLog)
    if params.action:
        stmt = stmt.where(AuditLog.action == params.action)
    if params.entity_type:
        stmt = stmt.where(AuditLog.entity_type == params.entity_type)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(AuditLog.created_at.desc())
    stmt = stmt.offset((params.page - 1) * params.page_size).limit(params.page_size)
    return list(db.scalars(stmt)), int(total)
