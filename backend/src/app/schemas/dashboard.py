from pydantic import BaseModel

from app.models.enums import LeadStage
from app.schemas.activity import ActivityRead
from app.schemas.task import TaskRead


class StageStat(BaseModel):
    stage: LeadStage
    count: int
    value: str


class DashboardStats(BaseModel):
    total_companies: int
    total_contacts: int
    open_leads: int
    won_leads: int
    lost_leads: int
    pipeline_value: str
    tasks_due_today: int
    tasks_overdue: int
    pipeline: list[StageStat]
    recent_activities: list[ActivityRead]
    due_today_tasks: list[TaskRead]
    overdue_tasks: list[TaskRead]
    upcoming_tasks: list[TaskRead]
