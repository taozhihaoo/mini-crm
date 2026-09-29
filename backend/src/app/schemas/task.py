from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import LeadPriority, TaskStatus
from app.schemas.brief import ContactBrief, LeadBrief, UserBrief


class TaskBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    related_lead_id: str | None = None
    related_contact_id: str | None = None
    due_at: datetime | None = None
    priority: LeadPriority = LeadPriority.medium


class TaskCreate(TaskBase):
    assigned_to: str | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    related_lead_id: str | None = None
    related_contact_id: str | None = None
    due_at: datetime | None = None
    status: TaskStatus | None = None
    priority: LeadPriority | None = None
    assigned_to: str | None = None


class TaskRead(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: TaskStatus
    assigned_to: str | None
    created_at: datetime
    updated_at: datetime

    related_lead: LeadBrief | None = None
    related_contact: ContactBrief | None = None
    assignee: UserBrief | None = None
