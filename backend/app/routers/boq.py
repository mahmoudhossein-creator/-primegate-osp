# ── boq.py ──────────────────────────────────────────────────
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user, require_dm_or_above
from app.models.user import BOQItem, User
from app.schemas.schemas import BOQItemCreate, BOQItemOut

router = APIRouter()

@router.post("/work-orders/{wo_id}/boq", response_model=BOQItemOut, status_code=201)
def add_boq_item(wo_id: int, payload: BOQItemCreate, db: Session = Depends(get_db), _: User = Depends(require_dm_or_above)):
    item = BOQItem(work_order_id=wo_id, **payload.model_dump())
    db.add(item); db.commit(); db.refresh(item)
    return item

@router.get("/work-orders/{wo_id}/boq", response_model=List[BOQItemOut])
def list_boq(wo_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(BOQItem).filter_by(work_order_id=wo_id).all()

@router.delete("/boq/{item_id}", status_code=204)
def delete_boq_item(item_id: int, db: Session = Depends(get_db), _: User = Depends(require_dm_or_above)):
    item = db.query(BOQItem).filter_by(id=item_id).first()
    if not item: raise HTTPException(404, "BOQ item not found")
    db.delete(item); db.commit()
