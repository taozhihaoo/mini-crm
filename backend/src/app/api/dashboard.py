from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.schemas.dashboard import DashboardStats
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardStats)
def get_dashboard(
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
) -> DashboardStats:
    return dashboard_service.get_dashboard(db)
