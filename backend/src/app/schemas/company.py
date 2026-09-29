from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field

from app.schemas.brief import ContactBrief, LeadBrief


class CompanyBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    website: str | None = Field(None, max_length=255)
    industry: str | None = Field(None, max_length=100)
    phone: str | None = Field(None, max_length=50)
    email: EmailStr | None = None
    address: str | None = Field(None, max_length=255)
    notes: str | None = None


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    website: str | None = Field(None, max_length=255)
    industry: str | None = Field(None, max_length=100)
    phone: str | None = Field(None, max_length=50)
    email: EmailStr | None = None
    address: str | None = Field(None, max_length=255)
    notes: str | None = None


class CompanyRead(CompanyBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    archived_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def archived(self) -> bool:
        return self.archived_at is not None


class CompanyDetail(CompanyRead):
    contacts: list[ContactBrief] = []
    leads: list[LeadBrief] = []
