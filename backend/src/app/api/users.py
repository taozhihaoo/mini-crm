from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_admin
from app.db.session import get_db
from app.models import User
from app.schemas.common import Page
from app.schemas.params import UserListParams
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(require_admin)])


@router.get("", response_model=Page[UserRead])
def list_users(
    params: UserListParams = Depends(),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> Page[UserRead]:
    users, total = user_service.list_users(db, params)
    return Page(
        items=[UserRead.model_validate(u) for u in users],
        total=total,
        page=params.page,
        page_size=params.page_size,
    )


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    return user_service.create_user(db, data, current_user)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: str,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    return user_service.update_user(db, user_id, data, current_user)
