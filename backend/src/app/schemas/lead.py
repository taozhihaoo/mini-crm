from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_serializer

from app.models.enums import LeadPriority, LeadSource, LeadStage
from app.schemas.brief import ActivityBrief, CompanyBrief, ContactBrief, TaskBrief, UserBrief

# Money is serialized with exactly two decimal places as a string to avoid float issues.
Money = Annotated[Decimal, Field(max_digits=12, decimal_places=2)]


def _quantize(value: Decimal) -> str:
    return str(value.quantize(Decimal("0.01")))


class LeadBase(BaseModel):
    company_id: str
    contact_id: str
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    value: Money = Decimal("0.00")
    currency: str = Field(default="USD", min_length=3, max_length=3)
    stage: LeadStage = LeadStage.new
    priority: LeadPriority = LeadPriority.medium
    source: LeadSource = LeadSource.other
    expected_close_date: date | None = None


class LeadCreate(LeadBase):
    """owner_id is optional and defaults to the authenticated user."""

    owner_id: str | None = None


class LeadUpdate(BaseModel):
    """Stage changes are intentionally excluded - use PATCH /leads/{id}/stage."""

    company_id: str | None = None
    contact_id: str | None = None
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    value: Money | None = None
    currency: str | None = Field(None, min_length=3, max_length=3)
    priority: LeadPriority | None = None
    source: LeadSource | None = None
    expected_close_date: date | None = None
    owner_id: str | None = None


class LeadStageUpdate(BaseModel):
    stage: LeadStage


class LeadRead(LeadBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    owner_id: str
    archived_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    company: CompanyBrief | None = None
    contact: ContactBrief | None = None
    owner: UserBrief | None = None

    @field_serializer("value")
    def serialize_value(self, value: Decimal) -> str:
        return _quantize(value)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def archived(self) -> bool:
        return self.archived_at is not None


class LeadDetail(LeadRead):
    activities: list[ActivityBrief] = []
    tasks: list[TaskBrief] = []
