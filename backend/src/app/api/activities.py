from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.activity import ActivityCreate, ActivityRead, ActivityUpdate
from app.schemas.common import Page
from app.schemas.params import ActivityListParams
from app.services import activity_service

router = APIRouter(prefix="/activities", tags=["activities"])


@router.get("", response_model=Page[ActivityRead])
def list_activities(
    params: ActivityListParams = Depends(),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> Page[ActivityRead]:
    activities, total = activity_service.list_activities(db, params)
    return Page(
        items=[ActivityRead.model_validate(a) for a in activities],
        total=total,
        page=params.page,
        page_size=params.page_size,
    )


@router.post("", response_model=ActivityRead, status_code=status.HTTP_201_CREATED)
def create_activity(
    data: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return activity_service.create_activity(db, data, current_user)


@router.patch("/{activity_id}", response_model=ActivityRead)
def update_activity(
    activity_id: str,
    data: ActivityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return activity_service.update_activity(db, activity_id, data, current_user)
