from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user, require_dm_or_above
from app.models.user import Team, TeamMember, User, TeamStatus
from app.schemas.schemas import TeamCreate, TeamUpdate, TeamOut, TeamStatusUpdate

router = APIRouter()


@router.get("/", response_model=List[TeamOut])
def list_teams(
    district_id: Optional[int] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Team).filter(Team.is_active == True)
    if district_id:
        q = q.filter(Team.district_id == district_id)
    if type:
        q = q.filter(Team.type == type)
    if status:
        q = q.filter(Team.status == status)
    return q.all()


@router.post("/", response_model=TeamOut, status_code=201)
def create_team(
    payload: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dm_or_above),
):
    team = Team(**payload.model_dump())
    db.add(team); db.commit(); db.refresh(team)
    return team


@router.get("/{team_id}", response_model=TeamOut)
def get_team(team_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(404, "Team not found")
    return team


@router.patch("/{team_id}", response_model=TeamOut)
def update_team(
    team_id: int, payload: TeamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dm_or_above),
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(404, "Team not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(team, k, v)
    db.commit(); db.refresh(team)
    return team


@router.patch("/{team_id}/status", response_model=TeamOut)
def update_status(
    team_id: int, payload: TeamStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mobile app calls this for check-in/out GPS updates."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(404, "Team not found")
    team.status = payload.status
    if payload.lat:
        team.last_lat = payload.lat
        team.last_lng = payload.lng
        from datetime import datetime
        team.last_seen_at = datetime.utcnow()
    db.commit(); db.refresh(team)
    return team


@router.post("/{team_id}/members/{user_id}", status_code=201)
def add_member(
    team_id: int, user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_dm_or_above),
):
    existing = db.query(TeamMember).filter_by(team_id=team_id, user_id=user_id, is_active=True).first()
    if existing:
        raise HTTPException(409, "User already in team")
    db.add(TeamMember(team_id=team_id, user_id=user_id))
    db.commit()
    return {"message": "Member added"}


@router.delete("/{team_id}/members/{user_id}")
def remove_member(
    team_id: int, user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_dm_or_above),
):
    member = db.query(TeamMember).filter_by(team_id=team_id, user_id=user_id, is_active=True).first()
    if not member:
        raise HTTPException(404, "Member not found")
    member.is_active = False
    db.commit()
    return {"message": "Member removed"}
