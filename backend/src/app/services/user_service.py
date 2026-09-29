from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, ConflictError, NotFoundError
from app.core.security import hash_password
from app.models import User
from app.repositories import user_repo
from app.schemas.params import UserListParams
from app.schemas.user import UserCreate, UserUpdate
from app.services import audit_service


def list_users(db: Session, params: UserListParams) -> tuple[list[User], int]:
    return user_repo.list_users(db, params)


def create_user(db: Session, data: UserCreate, actor: User) -> User:
    if user_repo.get_by_email(db, data.email):
        raise ConflictError("A user with this email already exists")

    user = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=data.role,
    )
    db.add(user)
    db.flush()
    audit_service.log(
        db,
        actor=actor,
        action="user.created",
        entity_type="user",
        entity_id=user.id,
        meta={"email": user.email, "role": user.role.value},
    )
    db.commit()
    return user


def update_user(db: Session, user_id: str, data: UserUpdate, actor: User) -> User:
    user = user_repo.get(db, user_id)
    if user is None:
        raise NotFoundError("User not found")

    changes = data.model_dump(exclude_unset=True, exclude_none=True)

    if changes.get("is_active") is False and user.id == actor.id:
        raise BusinessRuleError("You cannot deactivate your own account")

    if "password" in changes:
        user.password_hash = hash_password(changes.pop("password"))

    changed_fields = list(changes.keys())
    for field, value in changes.items():
        setattr(user, field, value)

    audit_service.log(
        db,
        actor=actor,
        action="user.updated",
        entity_type="user",
        entity_id=user.id,
        meta={"changed": changed_fields},
    )
    db.commit()
    return user
