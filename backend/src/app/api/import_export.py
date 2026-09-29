from datetime import date

from fastapi import APIRouter, Depends, File, Response, UploadFile
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.exceptions import BusinessRuleError, NotFoundError
from app.db.session import get_db
from app.schemas.import_ import ImportSummary
from app.services import export_service, import_service

router = APIRouter(tags=["import-export"])


def _require_csv(file: UploadFile) -> None:
    name = (file.filename or "").lower()
    if name and not name.endswith(".csv"):
        raise BusinessRuleError("Only .csv files are supported")


@router.post("/import/companies", response_model=ImportSummary)
def import_companies(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> ImportSummary:
    _require_csv(file)
    return import_service.import_companies(db, file.file, current_user)


@router.post("/import/contacts", response_model=ImportSummary)
def import_contacts(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> ImportSummary:
    _require_csv(file)
    return import_service.import_contacts(db, file.file, current_user)


@router.get("/export/{entity}")
def export_entity(
    entity: str,
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
) -> Response:
    builders = {
        "leads": export_service.export_leads,
        "companies": export_service.export_companies,
        "contacts": export_service.export_contacts,
        "tasks": export_service.export_tasks,
    }
    builder = builders.get(entity)
    if builder is None:
        raise NotFoundError(f"Unknown export entity '{entity}'")

    content = builder(db)
    filename = f"{entity}_{date.today().isoformat()}.csv"
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
