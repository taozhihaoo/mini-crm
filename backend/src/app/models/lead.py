import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import LeadPriority, LeadSource, LeadStage


class Lead(Base, TimestampMixin):
    __tablename__ = "leads"

    id: Mapped[uuid.UUID] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    contact_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("contacts.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    value: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    stage: Mapped[LeadStage] = mapped_column(
        SAEnum(LeadStage, name="lead_stage", native_enum=False, length=30),
        default=LeadStage.new,
        index=True,
        nullable=False,
    )
    priority: Mapped[LeadPriority] = mapped_column(
        SAEnum(LeadPriority, name="lead_priority", native_enum=False, length=30),
        default=LeadPriority.medium,
        nullable=False,
    )
    source: Mapped[LeadSource] = mapped_column(
        SAEnum(LeadSource, name="lead_source", native_enum=False, length=30),
        default=LeadSource.other,
        nullable=False,
    )
    expected_close_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    owner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    company = relationship("Company", lazy="selectin")
    contact = relationship("Contact", lazy="selectin")
    owner = relationship("User", lazy="selectin")
