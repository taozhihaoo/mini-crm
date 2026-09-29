from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field

from app.schemas.brief import ActivityBrief, CompanyBrief, LeadBrief, TaskBrief


class ContactBase(BaseModel):
    company_id: str
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: str | None = Field(None, max_length=50)
    job_title: str | None = Field(None, max_length=120)
    notes: str | None = None


class ContactCreate(ContactBase):
    pass


class ContactUpdate(BaseModel):
    company_id: str | None = None
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=50)
    job_title: str | None = Field(None, max_length=120)
    notes: str | None = None


class ContactRead(ContactBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    archived_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def archived(self) -> bool:
        return self.archived_at is not None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class ContactDetail(ContactRead):
    company: CompanyBrief | None = None
    leads: list[LeadBrief] = []
    activities: list[ActivityBrief] = []
    tasks: list[TaskBrief] = []
