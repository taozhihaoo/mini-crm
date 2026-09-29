"""CSV import with per-row validation, duplicate detection and row-level error reporting.

A single invalid row never fails the whole file: valid rows are imported,
invalid rows are reported with their row numbers.
"""

import csv
import io
from typing import BinaryIO

from pydantic import BaseModel, EmailStr, ValidationError, field_validator
from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError
from app.models import Company, Contact, User
from app.repositories import company_repo, contact_repo
from app.schemas.import_ import ImportSummary, RowError
from app.services import audit_service

MAX_IMPORT_ROWS = 5000
MAX_REPORTED_ERRORS = 100

COMPANY_COLUMNS = {"name", "website", "industry", "phone", "email", "address", "notes"}
COMPANY_REQUIRED_COLUMNS = {"name"}
CONTACT_COLUMNS = {"first_name", "last_name", "email", "company", "phone", "job_title", "notes"}
CONTACT_REQUIRED_COLUMNS = {"first_name", "last_name", "email", "company"}


class _BlankAsNone(BaseModel):
    """CSV blank cells arrive as empty strings; treat them as missing optional values."""

    @field_validator("*", mode="before")
    @classmethod
    def blank_to_none(cls, value):
        if isinstance(value, str) and value.strip() == "":
            return None
        return value


class CompanyRow(_BlankAsNone):
    name: str
    website: str | None = None
    industry: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    notes: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        value = (value or "").strip()
        if not value:
            raise ValueError("name must not be empty")
        return value


class ContactRow(_BlankAsNone):
    first_name: str
    last_name: str
    email: EmailStr
    company: str
    phone: str | None = None
    job_title: str | None = None
    notes: str | None = None

    @field_validator("first_name", "last_name", "company")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = (value or "").strip()
        if not value:
            raise ValueError("must not be empty")
        return value


def _read_csv(file: BinaryIO, required_columns: set[str], all_columns: set[str]) -> list[dict]:
    try:
        text = file.read().decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise BusinessRuleError("CSV file must be UTF-8 encoded") from exc

    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        raise BusinessRuleError("CSV file is empty or has no header row")

    headers = {name.strip().lower() for name in reader.fieldnames}
    missing = required_columns - headers
    if missing:
        raise BusinessRuleError(
            f"Missing required column(s): {', '.join(sorted(missing))}. "
            f"Expected columns: {', '.join(sorted(all_columns))}"
        )

    rows = []
    for row in reader:
        rows.append({(k or "").strip().lower(): (v or "").strip() for k, v in row.items() if k})
        if len(rows) > MAX_IMPORT_ROWS:
            raise BusinessRuleError(f"CSV file exceeds the maximum of {MAX_IMPORT_ROWS} rows")
    return rows


def _first_validation_error(exc: ValidationError) -> tuple[str | None, str]:
    error = exc.errors()[0]
    field = ".".join(str(part) for part in error.get("loc", [])) or None
    return field, error.get("msg", "Invalid value")


def import_companies(db: Session, file: BinaryIO, actor: User) -> ImportSummary:
    rows = _read_csv(file, COMPANY_REQUIRED_COLUMNS, COMPANY_COLUMNS)

    imported = skipped = errors = 0
    error_details: list[RowError] = []
    seen_names: set[str] = set()

    for index, row in enumerate(rows):
        row_number = index + 2  # +2: 1-based rows and a header line
        try:
            data = CompanyRow(**row)
        except ValidationError as exc:
            errors += 1
            if len(error_details) < MAX_REPORTED_ERRORS:
                field, message = _first_validation_error(exc)
                error_details.append(RowError(row=row_number, field=field, message=message))
            continue

        normalized = data.name.lower()
        if normalized in seen_names or company_repo.get_by_name(db, data.name) is not None:
            skipped += 1
            continue
        seen_names.add(normalized)

        db.add(Company(**data.model_dump()))
        imported += 1

    db.commit()
    summary = ImportSummary(
        imported=imported, skipped=skipped, errors=errors, error_details=error_details
    )
    audit_service.log(
        db,
        actor=actor,
        action="import.companies",
        entity_type="company",
        meta={"imported": imported, "skipped": skipped, "errors": errors},
    )
    db.commit()
    return summary


def import_contacts(db: Session, file: BinaryIO, actor: User) -> ImportSummary:
    rows = _read_csv(file, CONTACT_REQUIRED_COLUMNS, CONTACT_COLUMNS)

    imported = skipped = errors = 0
    error_details: list[RowError] = []
    seen_emails: set[str] = set()
    company_cache: dict[str, Company | None] = {}

    def resolve_company(name: str) -> Company | None:
        key = name.lower()
        if key not in company_cache:
            company_cache[key] = company_repo.get_by_name(db, name)
        return company_cache[key]

    for index, row in enumerate(rows):
        row_number = index + 2
        try:
            data = ContactRow(**row)
        except ValidationError as exc:
            errors += 1
            if len(error_details) < MAX_REPORTED_ERRORS:
                field, message = _first_validation_error(exc)
                error_details.append(RowError(row=row_number, field=field, message=message))
            continue

        email_key = data.email.lower()
        if email_key in seen_emails or contact_repo.get_by_email(db, data.email) is not None:
            skipped += 1
            continue

        company = resolve_company(data.company)
        if company is None:
            errors += 1
            if len(error_details) < MAX_REPORTED_ERRORS:
                error_details.append(
                    RowError(
                        row=row_number,
                        field="company",
                        message=f"Company '{data.company}' not found - import companies first",
                    )
                )
            continue
        seen_emails.add(email_key)

        db.add(
            Contact(
                company_id=company.id,
                first_name=data.first_name,
                last_name=data.last_name,
                email=data.email,
                phone=data.phone or None,
                job_title=data.job_title or None,
                notes=data.notes or None,
            )
        )
        imported += 1

    db.commit()
    summary = ImportSummary(
        imported=imported, skipped=skipped, errors=errors, error_details=error_details
    )
    audit_service.log(
        db,
        actor=actor,
        action="import.contacts",
        entity_type="contact",
        meta={"imported": imported, "skipped": skipped, "errors": errors},
    )
    db.commit()
    return summary
