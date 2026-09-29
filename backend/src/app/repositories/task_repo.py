from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Task
from app.models.enums import LeadPriority, TaskStatus
from app.repositories.base import contains
from app.schemas.params import TaskListParams


def get(db: Session, task_id: str) -> Task | None:
    return db.get(Task, task_id)


def list_tasks(db: Session, params: TaskListParams) -> tuple[list[Task], int]:
    stmt = select(Task)
    if params.search:
        stmt = stmt.where(Task.title.ilike(contains(params.search), escape="\\"))
    if params.status:
        stmt = stmt.where(Task.status == TaskStatus(params.status))
    if params.priority:
        stmt = stmt.where(Task.priority == LeadPriority(params.priority))
    if params.assigned_to:
        stmt = stmt.where(Task.assigned_to == params.assigned_to)
    if params.related_lead_id:
        stmt = stmt.where(Task.related_lead_id == params.related_lead_id)
    if params.related_contact_id:
        stmt = stmt.where(Task.related_contact_id == params.related_contact_id)
    if params.due_before is not None:
        stmt = stmt.where(Task.due_at < params.due_before)
    if params.due_after is not None:
        stmt = stmt.where(Task.due_at >= params.due_after)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    sort_col = getattr(Task, params.sort_by)
    stmt = stmt.order_by(sort_col.desc() if params.order == "desc" else sort_col.asc())
    stmt = stmt.offset((params.page - 1) * params.page_size).limit(params.page_size)
    return list(db.scalars(stmt)), int(total)


def due_between(db: Session, start: datetime, end: datetime, *, limit: int = 5) -> list[Task]:
    stmt = (
        select(Task)
        .where(Task.status == TaskStatus.open, Task.due_at >= start, Task.due_at < end)
        .order_by(Task.due_at.asc())
        .limit(limit)
    )
    return list(db.scalars(stmt))


def overdue(db: Session, before: datetime, *, limit: int = 5) -> list[Task]:
    stmt = (
        select(Task)
        .where(Task.status == TaskStatus.open, Task.due_at < before)
        .order_by(Task.due_at.asc())
        .limit(limit)
    )
    return list(db.scalars(stmt))


def upcoming(db: Session, after: datetime, *, limit: int = 5) -> list[Task]:
    stmt = (
        select(Task)
        .where(Task.status == TaskStatus.open, Task.due_at >= after)
        .order_by(Task.due_at.asc())
        .limit(limit)
    )
    return list(db.scalars(stmt))


def count_overdue(db: Session, before: datetime) -> int:
    return int(
        db.scalar(
            select(func.count()).where(Task.status == TaskStatus.open, Task.due_at < before)
        )
        or 0
    )


def count_due_between(db: Session, start: datetime, end: datetime) -> int:
    return int(
        db.scalar(
            select(func.count()).where(
                Task.status == TaskStatus.open, Task.due_at >= start, Task.due_at < end
            )
        )
        or 0
    )
