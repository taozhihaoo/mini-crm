from fastapi import APIRouter

from app.api import (
    activities,
    ai,
    audit_logs,
    auth,
    companies,
    contacts,
    dashboard,
    health,
    import_export,
    leads,
    tasks,
    users,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(dashboard.router)
api_router.include_router(companies.router)
api_router.include_router(contacts.router)
api_router.include_router(leads.router)
api_router.include_router(activities.router)
api_router.include_router(tasks.router)
api_router.include_router(ai.router)
api_router.include_router(import_export.router)
api_router.include_router(audit_logs.router)
