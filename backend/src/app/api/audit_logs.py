from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.db.session import get_db
from app.models import User
from app.repositories import audit_repo
from app.schemas.audit import AuditLogRead
from app.schemas.common import Page
from app.schemas.params import AuditLogListParams

router = APIRouter(prefix="/audit-logs", tags=["audit"], dependencies=[Depends(require_admin)])


@router.get("", response_model=Page[AuditLogRead])
def list_audit_logs(
    params: AuditLogListParams = Depends(),
    db: Session = Depends(get_db),
) -> Page[AuditLogRead]:
    entries, total = audit_repo.list_logs(db, params)

    user_ids = {entry.user_id for entry in entries if entry.user_id}
    emails: dict[str, str] = {}
    if user_ids:
        rows = db.query(User.id, User.email).filter(User.id.in_(user_ids)).all()
        emails = {user_id: email for user_id, email in rows}

    items = []
    for entry in entries:
        item = AuditLogRead.model_validate(entry)
        item.user_email = emails.get(entry.user_id or "")
        items.append(item)

    return Page(items=items, total=total, page=params.page, page_size=params.page_size)
