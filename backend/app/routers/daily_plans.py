from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user, require_dm_or_above, require_supervisor
from app.models.user import (
    DailyPlan, DailyPlanEntry, User, ApprovalStatus, Team, WorkOrder, BOQItem,
)
from app.schemas.schemas import (
    DailyPlanCreate, DailyPlanOut, TLSubmitRequest,
    SupervisorApproveRequest, CheckInRequest,
)

router = APIRouter()


@router.post("/", response_model=DailyPlanOut, status_code=201)
def create_daily_plan(
    payload: DailyPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dm_or_above),
):
    """DM creates the daily plan for a team+WO on a specific date+shift."""
    # Prevent duplicates
    existing = db.query(DailyPlan).filter_by(
        team_id=payload.team_id,
        work_order_id=payload.work_order_id,
        plan_date=payload.plan_date,
        shift=payload.shift,
    ).first()
    if existing:
        raise HTTPException(409, f"Plan already exists for this team/WO/{payload.shift} on {payload.plan_date}")

    plan = DailyPlan(
        team_id=payload.team_id,
        work_order_id=payload.work_order_id,
        plan_date=payload.plan_date,
        shift=payload.shift,
        created_by_id=current_user.id,
    )
    db.add(plan); db.flush()   # get plan.id before adding entries

    for entry in payload.entries:
        boq = db.query(BOQItem).filter_by(id=entry.boq_item_id).first()
        if not boq:
            raise HTTPException(404, f"BOQ item {entry.boq_item_id} not found")
        db.add(DailyPlanEntry(
            daily_plan_id=plan.id,
            boq_item_id=entry.boq_item_id,
            qty_planned=entry.qty_planned,
        ))

    db.commit(); db.refresh(plan)
    return plan


@router.get("/", response_model=List[DailyPlanOut])
def list_plans(
    team_id: Optional[int] = None,
    work_order_id: Optional[int] = None,
    plan_date: Optional[date] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(DailyPlan)
    if team_id:       q = q.filter_by(team_id=team_id)
    if work_order_id: q = q.filter_by(work_order_id=work_order_id)
    if plan_date:     q = q.filter_by(plan_date=plan_date)
    return q.order_by(DailyPlan.plan_date.desc()).all()


@router.get("/{plan_id}", response_model=DailyPlanOut)
def get_plan(plan_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    plan = db.query(DailyPlan).filter_by(id=plan_id).first()
    if not plan: raise HTTPException(404, "Plan not found")
    return plan


@router.post("/{plan_id}/check-in")
def check_in(
    plan_id: int, payload: CheckInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """TL checks in — validates geo-fence and records location + photo."""
    plan = db.query(DailyPlan).filter_by(id=plan_id).first()
    if not plan: raise HTTPException(404, "Plan not found")
    if plan.check_in_at:
        raise HTTPException(409, "Already checked in")

    # Geo-fence validation
    wo = db.query(WorkOrder).filter_by(id=plan.work_order_id).first()
    if wo and wo.location_lat:
        from app.services.geo_fence import is_within_fence
        if not is_within_fence(payload.lat, payload.lng, wo.location_lat, wo.location_lng, wo.geofence_radius_m):
            raise HTTPException(400, f"Location is outside work order geo-fence ({wo.geofence_radius_m}m radius)")

    plan.check_in_at = datetime.utcnow()
    plan.check_in_lat = payload.lat
    plan.check_in_lng = payload.lng
    plan.check_in_photo_url = payload.photo_url

    # Update team status to onsite
    team = db.query(Team).filter_by(id=plan.team_id).first()
    if team:
        team.status = "onsite"
        team.last_lat = payload.lat
        team.last_lng = payload.lng
        team.last_seen_at = datetime.utcnow()

    db.commit()
    return {"message": "Checked in successfully", "checked_in_at": plan.check_in_at}


@router.post("/{plan_id}/check-out")
def check_out(
    plan_id: int, payload: CheckInRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    plan = db.query(DailyPlan).filter_by(id=plan_id).first()
    if not plan: raise HTTPException(404, "Plan not found")
    if not plan.check_in_at: raise HTTPException(400, "Must check in first")

    plan.check_out_at = datetime.utcnow()
    plan.check_out_lat = payload.lat
    plan.check_out_lng = payload.lng
    plan.check_out_photo_url = payload.photo_url

    team = db.query(Team).filter_by(id=plan.team_id).first()
    if team: team.status = "transit"

    db.commit()
    return {"message": "Checked out", "checked_out_at": plan.check_out_at}


@router.post("/{plan_id}/submit", response_model=DailyPlanOut)
def tl_submit(
    plan_id: int, payload: TLSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Team Leader submits actual quantities → goes to Supervisor."""
    plan = db.query(DailyPlan).filter_by(id=plan_id).first()
    if not plan: raise HTTPException(404, "Plan not found")
    if plan.tl_submitted_at:
        raise HTTPException(409, "Already submitted")

    for actual in payload.entries:
        entry = db.query(DailyPlanEntry).filter_by(
            daily_plan_id=plan_id, boq_item_id=actual.boq_item_id
        ).first()
        if not entry:
            raise HTTPException(404, f"BOQ entry {actual.boq_item_id} not in this plan")
        entry.qty_actual      = actual.qty_actual
        entry.photo_urls      = actual.photo_urls
        entry.tl_notes        = actual.tl_notes
        entry.submitted_by_id = current_user.id
        entry.submitted_at    = datetime.utcnow()

    plan.tl_submitted_at = datetime.utcnow()
    plan.tl_notes        = payload.tl_notes
    # Status stays PENDING until supervisor acts
    db.commit(); db.refresh(plan)
    return plan


@router.post("/{plan_id}/supervisor-approve", response_model=DailyPlanOut)
def supervisor_approve(
    plan_id: int, payload: SupervisorApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_supervisor),
):
    """Supervisor approves/rejects → if approved, auto-marks as DM-received."""
    plan = db.query(DailyPlan).filter_by(id=plan_id).first()
    if not plan: raise HTTPException(404, "Plan not found")
    if not plan.tl_submitted_at:
        raise HTTPException(400, "TL has not submitted yet")
    if plan.sup_approved_at:
        raise HTTPException(409, "Already actioned by supervisor")

    now = datetime.utcnow()
    if payload.approved:
        plan.status              = ApprovalStatus.APPROVED
        plan.sup_approved_at     = now
        plan.sup_approved_by_id  = current_user.id
        plan.sup_notes           = payload.notes
        # Auto-forward to DM
        plan.dm_received_at      = now
    else:
        plan.status   = ApprovalStatus.REJECTED
        plan.sup_notes = payload.notes

    db.commit(); db.refresh(plan)
    return plan
