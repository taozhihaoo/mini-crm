"""CSV export generated from live database data, safe against spreadsheet formula injection."""

import csv
import io
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Company, Contact, Lead, Task

# Cells starting with these characters could be interpreted as formulas by Excel/LibreOffice.
_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def sanitize_cell(value) -> str:
    text = "" if value is None else str(value)
    if text.startswith(_FORMULA_PREFIXES):
        return "'" + text
    return text


def _rows_to_csv(headers: list[str], rows: list[list]) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    for row in rows:
        writer.writerow([sanitize_cell(cell) for cell in row])
    return buffer.getvalue()


def export_companies(db: Session) -> str:
    companies = db.scalars(
        select(Company).where(Company.archived_at.is_(None)).order_by(Company.name)
    ).all()
    return _rows_to_csv(
        ["id", "name", "website", "industry", "phone", "email", "address", "created_at"],
        [
            [
                c.id,
                c.name,
                c.website,
                c.industry,
                c.phone,
                c.email,
                c.address,
                c.created_at.isoformat(),
            ]
            for c in companies
        ],
    )


def export_contacts(db: Session) -> str:
    contacts = db.scalars(
        select(Contact).where(Contact.archived_at.is_(None)).order_by(Contact.last_name)
    ).all()
    return _rows_to_csv(
        [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone",
            "job_title",
            "company",
            "created_at",
        ],
        [
            [
                c.id,
                c.first_name,
                c.last_name,
                c.email,
                c.phone,
                c.job_title,
                c.company.name if c.company else "",
                c.created_at.isoformat(),
            ]
            for c in contacts
        ],
    )


def export_leads(db: Session) -> str:
    leads = db.scalars(select(Lead).where(Lead.archived_at.is_(None)).order_by(Lead.created_at)).all()
    return _rows_to_csv(
        [
            "id",
            "title",
            "company",
            "contact",
            "stage",
            "priority",
            "source",
            "value",
            "currency",
            "owner",
            "expected_close_date",
            "created_at",
        ],
        [
            [
                lead.id,
                lead.title,
                lead.company.name if lead.company else "",
                f"{lead.contact.first_name} {lead.contact.last_name}" if lead.contact else "",
                lead.stage.value,
                lead.priority.value,
                lead.source.value,
                Decimal(lead.value).quantize(Decimal("0.01")),
                lead.currency,
                lead.owner.full_name if lead.owner else "",
                lead.expected_close_date.isoformat() if lead.expected_close_date else "",
                lead.created_at.isoformat(),
            ]
            for lead in leads
        ],
    )


def export_tasks(db: Session) -> str:
    tasks = db.scalars(select(Task).order_by(Task.created_at)).all()
    return _rows_to_csv(
        ["id", "title", "status", "priority", "due_at", "assigned_to", "created_at"],
        [
            [
                t.id,
                t.title,
                t.status.value,
                t.priority.value,
                t.due_at.isoformat() if t.due_at else "",
                t.assignee.full_name if t.assignee else "",
                t.created_at.isoformat(),
            ]
            for t in tasks
        ],
    )
