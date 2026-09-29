from datetime import datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import ActivityType
from app.schemas.brief import CompanyBrief, ContactBrief, LeadBrief


class ActivityBase(BaseModel):
    type: ActivityType
    subject: str = Field(min_length=1, max_length=200)
    content: str | None = None
    company_id: str | None = None
    contact_id: str | None = None
    lead_id: str | None = None

    @model_validator(mode="after")
    def check_has_link(self) -> Self:
        if not (self.company_id or self.contact_id or self.lead_id):
            raise ValueError("Activity must be linked to a lead, a contact, or a company")
        return self


class ActivityCreate(ActivityBase):
    occurred_at: datetime | None = None


class ActivityRead(ActivityBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    occurred_at: datetime
    created_at: datetime

    lead: LeadBrief | None = None
    contact: ContactBrief | None = None
    company: CompanyBrief | None = None


class ActivityUpdate(BaseModel):
    type: ActivityType | None = None
    subject: str | None = Field(None, min_length=1, max_length=200)
    content: str | None = None
    occurred_at: datetime | None = None
