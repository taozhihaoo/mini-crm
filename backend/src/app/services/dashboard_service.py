from datetime import UTC, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.enums import LeadStage
from app.repositories import activity_repo, company_repo, contact_repo, lead_repo, task_repo
from app.schemas.dashboard import DashboardStats, StageStat

OPEN_STAGES = {LeadStage.new, LeadStage.qualified, LeadStage.proposal, LeadStage.negotiation}


def _day_bounds() -> tuple[datetime, datetime]:
    """'Today' is defined on the UTC day, matching how all timestamps are stored."""
    now = datetime.now(UTC)
    today_start = datetime.combine(now.date(), time.min, tzinfo=UTC)
    return today_start, today_start + timedelta(days=1)


def _money(value: Decimal | int | float) -> str:
    return str(Decimal(value).quantize(Decimal("0.01")))


def get_dashboard(db: Session) -> DashboardStats:
    today_start, tomorrow_start = _day_bounds()

    stage_stats = lead_repo.sum_value_by_stage(db)
    open_count = sum(stage_stats.get(stage, (0, Decimal(0)))[0] for stage in OPEN_STAGES)
    open_value = sum(
        (stage_stats.get(stage, (0, Decimal(0)))[1] for stage in OPEN_STAGES), Decimal(0)
    )

    pipeline = [
        StageStat(
            stage=stage,
            count=stage_stats.get(stage, (0, Decimal(0)))[0],
            value=_money(stage_stats.get(stage, (0, Decimal(0)))[1]),
        )
        for stage in LeadStage
    ]

    return DashboardStats(
        total_companies=company_repo.count_active(db),
        total_contacts=contact_repo.count_active(db),
        open_leads=open_count,
        won_leads=stage_stats.get(LeadStage.won, (0, Decimal(0)))[0],
        lost_leads=stage_stats.get(LeadStage.lost, (0, Decimal(0)))[0],
        pipeline_value=_money(open_value),
        tasks_due_today=task_repo.count_due_between(db, today_start, tomorrow_start),
        tasks_overdue=task_repo.count_overdue(db, today_start),
        pipeline=pipeline,
        recent_activities=activity_repo.recent(db, limit=8),
        due_today_tasks=task_repo.due_between(db, today_start, tomorrow_start),
        overdue_tasks=task_repo.overdue(db, today_start),
        upcoming_tasks=task_repo.upcoming(db, tomorrow_start),
    )
