from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from app.core.database import get_db
from app.core.security import get_current_user, require_dm_or_above
from app.models.user import SiteExpense, ApprovalStatus, User
from app.schemas.schemas import ExpenseCreate, ExpenseOut, ExpenseApproveRequest

router = APIRouter()

@router.post("/", response_model=ExpenseOut, status_code=201)
def create_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    exp = SiteExpense(submitted_by_id=current_user.id, **payload.model_dump())
    db.add(exp); db.commit(); db.refresh(exp)
    return exp

@router.get("/", response_model=List[ExpenseOut])
def list_expenses(
    district_id: Optional[int] = None,
    team_id: Optional[int] = None,
    work_order_id: Optional[int] = None,
    status: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(SiteExpense)
    if team_id:       q = q.filter_by(team_id=team_id)
    if work_order_id: q = q.filter_by(work_order_id=work_order_id)
    if status:        q = q.filter_by(status=status)
    if from_date:     q = q.filter(SiteExpense.expense_date >= from_date)
    if to_date:       q = q.filter(SiteExpense.expense_date <= to_date)
    return q.order_by(SiteExpense.expense_date.desc()).all()

@router.get("/summary")
def expenses_summary(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Aggregated totals by category and district — used by dashboard charts."""
    from sqlalchemy import func, extract
    from app.models.user import ExpenseCategory, District, Team, WorkOrder
    q = db.query(SiteExpense).filter_by(status=ApprovalStatus.APPROVED)
    if month: q = q.filter(extract("month", SiteExpense.expense_date) == month)
    if year:  q = q.filter(extract("year",  SiteExpense.expense_date) == year)
    rows = q.all()

    by_cat = {}
    by_district = {}
    total = 0
    for r in rows:
        cat = r.category.value
        by_cat[cat] = by_cat.get(cat, 0) + r.amount_sar
        dist = r.work_order.district.name if r.work_order and r.work_order.district else "Unknown"
        by_district[dist] = by_district.get(dist, 0) + r.amount_sar
        total += r.amount_sar

    return {"total_sar": total, "by_category": by_cat, "by_district": by_district}

@router.patch("/{exp_id}/approve", response_model=ExpenseOut)
def approve_expense(
    exp_id: int, payload: ExpenseApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dm_or_above),
):
    exp = db.query(SiteExpense).filter_by(id=exp_id).first()
    if not exp: raise HTTPException(404, "Expense not found")
    if exp.status != ApprovalStatus.PENDING:
        raise HTTPException(409, "Expense already actioned")
    exp.status = ApprovalStatus.APPROVED if payload.approved else ApprovalStatus.REJECTED
    exp.approved_by_id = current_user.id
    exp.approved_at = datetime.utcnow()
    exp.rejection_reason = payload.rejection_reason
    db.commit(); db.refresh(exp)
    return exp
