from datetime import datetime
from typing import ClassVar, Literal, Self

from pydantic import BaseModel, Field, model_validator

from app.models.enums import ActivityType, LeadPriority, LeadStage, TaskStatus


class BaseListParams(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
    search: str | None = Field(None, max_length=200)
    sort_by: str = "created_at"
    order: Literal["asc", "desc"] = "desc"

    allowed_sort_fields: ClassVar[set[str]] = {"created_at"}

    @model_validator(mode="after")
    def check_sort_field(self) -> Self:
        if self.sort_by not in self.allowed_sort_fields:
            raise ValueError(
                f"Invalid sort field '{self.sort_by}'. Allowed: {sorted(self.allowed_sort_fields)}"
            )
        return self


class CompanyListParams(BaseListParams):
    industry: str | None = None
    allowed_sort_fields: ClassVar[set[str]] = {"name", "industry", "created_at"}


class ContactListParams(BaseListParams):
    company_id: str | None = None
    allowed_sort_fields: ClassVar[set[str]] = {"first_name", "last_name", "email", "created_at"}


class LeadListParams(BaseListParams):
    stage: LeadStage | None = None
    priority: LeadPriority | None = None
    owner_id: str | None = None
    company_id: str | None = None
    contact_id: str | None = None
    allowed_sort_fields: ClassVar[set[str]] = {
        "title",
        "value",
        "stage",
        "priority",
        "expected_close_date",
        "created_at",
    }


class ActivityListParams(BaseListParams):
    lead_id: str | None = None
    contact_id: str | None = None
    company_id: str | None = None
    type: ActivityType | None = None
    allowed_sort_fields: ClassVar[set[str]] = {"occurred_at", "created_at"}
    sort_by: str = "occurred_at"


class TaskListParams(BaseListParams):
    status: TaskStatus | None = None
    priority: LeadPriority | None = None
    assigned_to: str | None = None
    related_lead_id: str | None = None
    related_contact_id: str | None = None
    due_before: datetime | None = None
    due_after: datetime | None = None
    allowed_sort_fields: ClassVar[set[str]] = {"title", "due_at", "priority", "status", "created_at"}


class UserListParams(BaseListParams):
    allowed_sort_fields: ClassVar[set[str]] = {"email", "full_name", "created_at"}


class AuditLogListParams(BaseListParams):
    action: str | None = None
    entity_type: str | None = None
    allowed_sort_fields: ClassVar[set[str]] = {"created_at", "action"}
