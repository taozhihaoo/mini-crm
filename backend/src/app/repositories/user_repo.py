from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import User
from app.schemas.params import UserListParams


def get(db: Session, user_id: str) -> User | None:
    return db.get(User, user_id)


def get_by_email(db: Session, email: str) -> User | None:
    stmt = select(User).where(func.lower(User.email) == email.strip().lower())
    return db.scalars(stmt).first()


def list_users(db: Session, params: UserListParams) -> tuple[list[User], int]:
    stmt = select(User)
    total = db.scalar(select(func.count()).select_from(User)) or 0

    sort_col = getattr(User, params.sort_by)
    stmt = stmt.order_by(sort_col.desc() if params.order == "desc" else sort_col.asc())
    stmt = stmt.offset((params.page - 1) * params.page_size).limit(params.page_size)
    return list(db.scalars(stmt)), int(total)
