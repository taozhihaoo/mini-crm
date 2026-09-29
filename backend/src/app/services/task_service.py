from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.models import Task, User
from app.models.enums import TaskStatus
from app.repositories import contact_repo, lead_repo, task_repo, user_repo
from app.schemas.params import TaskListParams
from app.schemas.task import TaskCreate, TaskUpdate
from app.services import audit_service


def _validate_references(db: Session, *, lead_id: str | None, contact_id: str | None, assigned_to: str | None) -> None:
    if lead_id and lead_repo.get(db, lead_id) is None:
        raise BusinessRuleError("Lead does not exist")
    if contact_id and contact_repo.get(db, contact_id) is None:
        raise BusinessRuleError("Contact does not exist")
    if assigned_to and user_repo.get(db, assigned_to) is None:
        raise BusinessRuleError("Assigned user does not exist")


def list_tasks(db: Session, params: TaskListParams) -> tuple[list[Task], int]:
    return task_repo.list_tasks(db, params)


def create_task(db: Session, data: TaskCreate, actor: User) -> Task:
    _validate_references(
        db, lead_id=data.related_lead_id, contact_id=data.related_contact_id, assigned_to=data.assigned_to
    )

    task = Task(
        **data.model_dump(exclude={"assigned_to"}), assigned_to=data.assigned_to or actor.id
    )
    db.add(task)
    db.flush()
    audit_service.log(
        db,
        actor=actor,
        action="task.created",
        entity_type="task",
        entity_id=task.id,
        meta={"title": task.title, "priority": task.priority.value},
    )
    db.commit()
    return task


def get_task(db: Session, task_id: str) -> Task:
    task = task_repo.get(db, task_id)
    if task is None:
        raise NotFoundError("Task not found")
    return task


def update_task(db: Session, task_id: str, data: TaskUpdate, actor: User) -> Task:
    task = get_task(db, task_id)
    changes = data.model_dump(exclude_unset=True)

    if "related_lead_id" in changes or "related_contact_id" in changes or "assigned_to" in changes:
        _validate_references(
            db,
            lead_id=changes.get("related_lead_id", task.related_lead_id),
            contact_id=changes.get("related_contact_id", task.related_contact_id),
            assigned_to=changes.get("assigned_to", task.assigned_to),
        )

    old_status = task.status
    for field, value in changes.items():
        setattr(task, field, value)

    action = "task.updated"
    if "status" in changes and changes["status"] != old_status:
        if task.status == TaskStatus.completed:
            action = "task.completed"
        elif task.status == TaskStatus.cancelled:
            action = "task.cancelled"

    audit_service.log(
        db,
        actor=actor,
        action=action,
        entity_type="task",
        entity_id=task.id,
        meta={"changed": list(changes.keys())},
    )
    db.commit()
    return task
