"""
auth.py  — login / refresh / me
teams.py — CRUD teams + status update + assignment
work_orders.py — CRUD WOs + milestone advance + team assign
daily_plans.py — create plan, TL submit, supervisor approve, check-in/out
boq.py   — BOQ items CRUD
materials.py — stock, usage
expenses.py  — site expenses CRUD + approval
reports.py   — aggregated dashboards
"""
# ─────────── auth.py ───────────
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.core.security import (
    verify_password, hash_password, create_access_token,
    create_refresh_token, get_current_user,
)
from app.models.user import User
from app.schemas.schemas import LoginRequest, TokenResponse, UserCreate, UserOut

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    refresh = create_refresh_token({"sub": str(user.id)})
    return {"access_token": token, "refresh_token": refresh, "user": user}

@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db),
             current_user: User = Depends(get_current_user)):
    # Only management can create users
    from app.models.user import UserRole
    if current_user.role != UserRole.MANAGEMENT:
        raise HTTPException(status_code=403, detail="Only management can create users")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        name=payload.name, email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role, phone=payload.phone,
        district_id=payload.district_id,
    )
    db.add(user); db.commit(); db.refresh(user)
    return user
