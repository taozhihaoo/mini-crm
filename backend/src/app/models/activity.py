import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ActivityType


class Activity(Base):
    __tablename__ = "activities"
    __table_args__ = (
        CheckConstraint(
            "company_id IS NOT NULL OR contact_id IS NOT NULL OR lead_id IS NOT NULL",
            name="ck_activities_has_link",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    company_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=True
    )
    contact_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("contacts.id", ondelete="CASCADE"), index=True, nullable=True
    )
    lead_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("leads.id", ondelete="CASCADE"), index=True, nullable=True
    )
    type: Mapped[ActivityType] = mapped_column(
        SAEnum(ActivityType, name="activity_type", native_enum=False, length=30), nullable=False
    )
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    company = relationship("Company", lazy="selectin")
    contact = relationship("Contact", lazy="selectin")
    lead = relationship("Lead", lazy="selectin")
