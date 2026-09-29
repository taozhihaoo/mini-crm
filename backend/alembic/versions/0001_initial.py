"""initial schema - users, companies, contacts, leads, activities, tasks, audit_logs

Revision ID: 0001
Revises:
Create Date: 2026-09-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _enum(values: list[str], name: str) -> sa.Enum:
    return sa.Enum(*values, name=name, native_enum=False, length=30)


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("role", _enum(["admin", "member"], "user_role"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "companies",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("website", sa.String(length=255), nullable=True),
        sa.Column("industry", sa.String(length=100), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_companies_name"), "companies", ["name"])
    op.create_index(op.f("ix_companies_industry"), "companies", ["industry"])

    op.create_table(
        "contacts",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("company_id", sa.String(length=36), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("job_title", sa.String(length=120), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_contacts_company_id"), "contacts", ["company_id"])
    op.create_index(op.f("ix_contacts_email"), "contacts", ["email"])

    op.create_table(
        "leads",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("company_id", sa.String(length=36), nullable=False),
        sa.Column("contact_id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("value", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column(
            "stage",
            _enum(["new", "qualified", "proposal", "negotiation", "won", "lost"], "lead_stage"),
            nullable=False,
        ),
        sa.Column("priority", _enum(["low", "medium", "high"], "lead_priority"), nullable=False),
        sa.Column(
            "source",
            _enum(["website", "referral", "email", "cold_outreach", "other"], "lead_source"),
            nullable=False,
        ),
        sa.Column("expected_close_date", sa.Date(), nullable=True),
        sa.Column("owner_id", sa.String(length=36), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["contact_id"], ["contacts.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_leads_company_id"), "leads", ["company_id"])
    op.create_index(op.f("ix_leads_contact_id"), "leads", ["contact_id"])
    op.create_index(op.f("ix_leads_stage"), "leads", ["stage"])
    op.create_index(op.f("ix_leads_owner_id"), "leads", ["owner_id"])

    op.create_table(
        "activities",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("company_id", sa.String(length=36), nullable=True),
        sa.Column("contact_id", sa.String(length=36), nullable=True),
        sa.Column("lead_id", sa.String(length=36), nullable=True),
        sa.Column("type", _enum(["note", "call", "email", "meeting"], "activity_type"), nullable=False),
        sa.Column("subject", sa.String(length=200), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "company_id IS NOT NULL OR contact_id IS NOT NULL OR lead_id IS NOT NULL",
            name="ck_activities_has_link",
        ),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["contact_id"], ["contacts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_activities_contact_id"), "activities", ["contact_id"])
    op.create_index(op.f("ix_activities_lead_id"), "activities", ["lead_id"])

    op.create_table(
        "tasks",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("related_lead_id", sa.String(length=36), nullable=True),
        sa.Column("related_contact_id", sa.String(length=36), nullable=True),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", _enum(["open", "completed", "cancelled"], "task_status"), nullable=False),
        sa.Column("priority", _enum(["low", "medium", "high"], "lead_priority"), nullable=False),
        sa.Column("assigned_to", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["related_lead_id"], ["leads.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["related_contact_id"], ["contacts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["assigned_to"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tasks_related_lead_id"), "tasks", ["related_lead_id"])
    op.create_index(op.f("ix_tasks_related_contact_id"), "tasks", ["related_contact_id"])
    op.create_index(op.f("ix_tasks_due_at"), "tasks", ["due_at"])
    op.create_index(op.f("ix_tasks_status"), "tasks", ["status"])

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.String(length=36), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_audit_logs_action"), "audit_logs", ["action"])
    op.create_index(op.f("ix_audit_logs_created_at"), "audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("tasks")
    op.drop_table("activities")
    op.drop_table("leads")
    op.drop_table("contacts")
    op.drop_table("companies")
    op.drop_table("users")
