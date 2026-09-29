from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, InvalidCredentialsError
from app.core.security import hash_password, verify_password
from app.models import User
from app.repositories import user_repo
from app.services import audit_service


def authenticate(db: Session, email: str, password: str) -> User:
    user = user_repo.get_by_email(db, email)
    if user is None or not verify_password(password, user.password_hash):
        raise InvalidCredentialsError
    if not user.is_active:
        # Same generic message to avoid leaking account state.
        raise InvalidCredentialsError

    audit_service.log(db, actor=user, action="auth.login", entity_type="user", entity_id=user.id)
    db.commit()
    return user


def change_password(db: Session, user: User, current_password: str, new_password: str) -> None:
    if not verify_password(current_password, user.password_hash):
        raise BusinessRuleError("Current password is incorrect")

    user.password_hash = hash_password(new_password)
    audit_service.log(db, actor=user, action="auth.password_changed", entity_type="user", entity_id=user.id)
    db.commit()
