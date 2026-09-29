from typing import Any

from sqlalchemy.orm import Session

from app.models import User
from app.repositories import audit_repo


def log(
    db: Session,
    *,
    actor: User | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    meta: dict[str, Any] | None = None,
) -> None:
    """Record an audit entry as part of the caller's transaction.

    Never store secrets (passwords, tokens, API keys) in metadata.
    """
    audit_repo.record(
        db,
        user_id=actor.id if actor else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        meta=meta,
    )
