from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.common import Page
from app.schemas.params import TaskListParams
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.services import task_service

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=Page[TaskRead])
def list_tasks(
    params: TaskListParams = Depends(),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> Page[TaskRead]:
    tasks, total = task_service.list_tasks(db, params)
    return Page(
        items=[TaskRead.model_validate(t) for t in tasks],
        total=total,
        page=params.page,
        page_size=params.page_size,
    )


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return task_service.create_task(db, data, current_user)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: str,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return task_service.update_task(db, task_id, data, current_user)
