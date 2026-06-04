# ── reports.py ──────────────────────────────────────────────
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional
from datetime import date
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import (
    Team, WorkOrder, DailyPlan, DailyPlanEntry,
    BOQItem, SiteExpense, ApprovalStatus, User, District,
)

router = APIRouter()

@router.get("/dashboard-summary")
def dashboard_summary(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Main dashboard KPIs — one call for everything the frontend needs."""
    today = date.today()
    total_teams  = db.query(Team).filter_by(is_active=True).count()
    onsite       = db.query(Team).filter_by(status="onsite", is_active=True).count()
    total_wos    = db.query(WorkOrder).filter_by(is_active=True).count()

    today_plans  = db.query(DailyPlan).filter_by(plan_date=today).count()
    pending_sup  = db.query(DailyPlan).filter(
        DailyPlan.plan_date == today,
        DailyPlan.tl_submitted_at.isnot(None),
        DailyPlan.sup_approved_at.is_(None),
    ).count()
    reached_dm   = db.query(DailyPlan).filter(
        DailyPlan.plan_date == today,
        DailyPlan.sup_approved_at.isnot(None),
        DailyPlan.dm_received_at.isnot(None),
    ).count()

    return {
        "total_teams": total_teams,
        "teams_onsite": onsite,
        "total_wos": total_wos,
        "plans_today": today_plans,
        "pending_supervisor": pending_sup,
        "reached_dm": reached_dm,
    }

@router.get("/teams-distribution")
def teams_distribution(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """For the 3 charts: by type, by district, type×district."""
    teams = db.query(Team).filter_by(is_active=True).all()
    by_type = {}
    by_district = {}
    cross = {}
    for t in teams:
        by_type[t.type.value] = by_type.get(t.type.value, 0) + 1
        dist = t.district.name if t.district else "Unknown"
        by_district[dist] = by_district.get(dist, 0) + 1
        key = (dist, t.type.value)
        cross[key] = cross.get(key, 0) + 1
    return {
        "by_type": by_type,
        "by_district": by_district,
        "by_district_and_type": [{"district": k[0], "type": k[1], "count": v} for k, v in cross.items()],
    }

@router.get("/achievements")
def achievements(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    district_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Financial achievements = Σ(qty_actual × unit_price) for approved plans."""
    q = (
        db.query(DailyPlanEntry)
        .join(DailyPlan)
        .join(BOQItem)
        .filter(DailyPlan.status == ApprovalStatus.APPROVED)
    )
    if from_date: q = q.filter(DailyPlan.plan_date >= from_date)
    if to_date:   q = q.filter(DailyPlan.plan_date <= to_date)
    total = sum(
        (e.qty_actual or 0) * (e.boq_item.unit_price if e.boq_item else 0)
        for e in q.all()
    )
    return {"total_achievement_sar": total}
