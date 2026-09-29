from pydantic import BaseModel


class RowError(BaseModel):
    row: int
    field: str | None = None
    message: str


class ImportSummary(BaseModel):
    """Result report for a CSV import run."""

    imported: int
    skipped: int
    errors: int
    error_details: list[RowError]
