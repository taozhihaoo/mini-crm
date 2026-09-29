from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User, UserRole
from app.repositories import user_repo

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise UnauthorizedError

    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise UnauthorizedError

    user = user_repo.get(db, user_id)
    if user is None or not user.is_active:
        raise UnauthorizedError
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise ForbiddenError("Admin role required")
    return user
