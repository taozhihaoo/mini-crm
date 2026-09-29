"""Compact entity representations embedded in other API responses.

Kept in a single module to avoid circular imports between entity schemas.
"""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, computed_field, field_serializer


class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    email: EmailStr


class CompanyBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    industry: str | None = None


class ContactBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    first_name: str
    last_name: str
    email: EmailStr
    company_id: str
    job_title: str | None = None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class LeadBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    stage: str
    value: Decimal
    currency: str
    company_id: str
    contact_id: str
    created_at: datetime

    @field_serializer("value")
    def serialize_value(self, value: Decimal) -> str:
        return str(value.quantize(Decimal("0.01")))


class ActivityBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    subject: str
    content: str | None = None
    occurred_at: datetime
    lead_id: str | None = None
    contact_id: str | None = None
    company_id: str | None = None


class TaskBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    status: str
    priority: str
    due_at: datetime | None = None
    related_lead_id: str | None = None
    related_contact_id: str | None = None
