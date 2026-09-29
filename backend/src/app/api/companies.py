from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models import Company, User
from app.schemas.brief import ContactBrief, LeadBrief
from app.schemas.common import Page
from app.schemas.company import CompanyCreate, CompanyDetail, CompanyRead, CompanyUpdate
from app.schemas.params import CompanyListParams
from app.services import company_service

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("", response_model=Page[CompanyRead])
def list_companies(
    params: CompanyListParams = Depends(),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> Page[CompanyRead]:
    companies, total = company_service.list_companies(db, params)
    return Page(
        items=[CompanyRead.model_validate(c) for c in companies],
        total=total,
        page=params.page,
        page_size=params.page_size,
    )


@router.post("", response_model=CompanyRead, status_code=status.HTTP_201_CREATED)
def create_company(
    data: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Company:
    return company_service.create_company(db, data, current_user)


@router.get("/{company_id}", response_model=CompanyDetail)
def get_company(
    company_id: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> CompanyDetail:
    company, contacts, leads = company_service.get_company_detail(db, company_id)
    detail = CompanyDetail.model_validate(company)
    detail.contacts = [ContactBrief.model_validate(c) for c in contacts]
    detail.leads = [LeadBrief.model_validate(lead) for lead in leads]
    return detail


@router.patch("/{company_id}", response_model=CompanyRead)
def update_company(
    company_id: str,
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Company:
    return company_service.update_company(db, company_id, data, current_user)


@router.post("/{company_id}/archive", response_model=CompanyRead)
def archive_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Company:
    return company_service.archive_company(db, company_id, current_user)


@router.post("/{company_id}/unarchive", response_model=CompanyRead)
def unarchive_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Company:
    return company_service.unarchive_company(db, company_id, current_user)
