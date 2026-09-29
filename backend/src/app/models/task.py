import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import LeadPriority, TaskStatus


class Task(Base, TimestampMixin):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    related_lead_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("leads.id", ondelete="CASCADE"), index=True, nullable=True
    )
    related_contact_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("contacts.id", ondelete="CASCADE"), index=True, nullable=True
    )
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    status: Mapped[TaskStatus] = mapped_column(
        SAEnum(TaskStatus, name="task_status", native_enum=False, length=30),
        default=TaskStatus.open,
        index=True,
        nullable=False,
    )
    priority: Mapped[LeadPriority] = mapped_column(
        SAEnum(LeadPriority, name="lead_priority", native_enum=False, length=30),
        default=LeadPriority.medium,
        nullable=False,
    )
    assigned_to: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    related_lead = relationship("Lead", lazy="selectin")
    related_contact = relationship("Contact", lazy="selectin")
    assignee = relationship("User", lazy="selectin")
