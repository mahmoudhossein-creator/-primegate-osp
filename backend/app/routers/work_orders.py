# ════════════════════════════════════════════
#  work_orders.py
# ════════════════════════════════════════════
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user, require_dm_or_above
from app.models.user import WorkOrder, TeamWorkOrderAssignment, User
from app.schemas.schemas import WorkOrderCreate, WorkOrderOut, WorkOrderMilestoneUpdate, AssignTeamRequest

router = APIRouter()

@router.post("/", response_model=WorkOrderOut, status_code=201)
def create_wo(payload: WorkOrderCreate, db: Session = Depends(get_db), _: User = Depends(require_dm_or_above)):
    if db.query(WorkOrder).filter_by(wo_number=payload.wo_number).first():
        raise HTTPException(409, "WO number already exists")
    wo = WorkOrder(**payload.model_dump())
    db.add(wo); db.commit(); db.refresh(wo)
    return wo

@router.get("/", response_model=List[WorkOrderOut])
def list_wos(
    district_id: Optional[int] = None, milestone: Optional[str] = None,
    db: Session = Depends(get_db), _: User = Depends(get_current_user),
):
    q = db.query(WorkOrder).filter_by(is_active=True)
    if district_id: q = q.filter_by(district_id=district_id)
    if milestone:   q = q.filter_by(milestone=milestone)
    return q.order_by(WorkOrder.created_at.desc()).all()

@router.get("/{wo_id}", response_model=WorkOrderOut)
def get_wo(wo_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    wo = db.query(WorkOrder).filter_by(id=wo_id).first()
    if not wo: raise HTTPException(404, "Work order not found")
    return wo

@router.patch("/{wo_id}/milestone", response_model=WorkOrderOut)
def advance_milestone(
    wo_id: int, payload: WorkOrderMilestoneUpdate,
    db: Session = Depends(get_db), _: User = Depends(require_dm_or_above),
):
    wo = db.query(WorkOrder).filter_by(id=wo_id).first()
    if not wo: raise HTTPException(404, "Work order not found")
    wo.milestone = payload.milestone
    db.commit(); db.refresh(wo)
    return wo

@router.post("/{wo_id}/assign-team", status_code=201)
def assign_team(
    wo_id: int, payload: AssignTeamRequest,
    db: Session = Depends(get_db), _: User = Depends(require_dm_or_above),
):
    existing = db.query(TeamWorkOrderAssignment).filter_by(
        team_id=payload.team_id, work_order_id=wo_id, is_active=True
    ).first()
    if existing: raise HTTPException(409, "Team already assigned to this WO")
    db.add(TeamWorkOrderAssignment(team_id=payload.team_id, work_order_id=wo_id))
    db.commit()
    return {"message": "Team assigned"}

@router.delete("/{wo_id}/assign-team/{team_id}")
def unassign_team(
    wo_id: int, team_id: int,
    db: Session = Depends(get_db), _: User = Depends(require_dm_or_above),
):
    asgn = db.query(TeamWorkOrderAssignment).filter_by(
        team_id=team_id, work_order_id=wo_id, is_active=True
    ).first()
    if not asgn: raise HTTPException(404, "Assignment not found")
    asgn.is_active = False
    db.commit()
    return {"message": "Team unassigned"}
