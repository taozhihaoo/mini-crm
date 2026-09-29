from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import UserRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=120)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.member


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=120)
    role: UserRole | None = None
    is_active: bool | None = None
    password: str | None = Field(None, min_length=8, max_length=128)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
