from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user, require_dm_or_above
from app.models.user import Material, MaterialStock, MaterialUsage, User
from app.schemas.schemas import MaterialCreate, MaterialOut, MaterialUsageCreate

router = APIRouter()

@router.get("/", response_model=List[MaterialOut])
def list_materials(
    district_id: Optional[int] = None,
    low_stock_only: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    materials = db.query(Material).all()
    if low_stock_only:
        materials = [
            m for m in materials
            if any(
                (s.qty_on_hand - s.qty_reserved) <= m.reorder_level
                for s in m.stock
            )
        ]
    return materials

@router.post("/", response_model=MaterialOut, status_code=201)
def create_material(payload: MaterialCreate, db: Session = Depends(get_db), _: User = Depends(require_dm_or_above)):
    m = Material(**payload.model_dump())
    db.add(m); db.commit(); db.refresh(m)
    return m

@router.get("/shortage-alerts")
def shortage_alerts(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Returns materials where any warehouse stock <= reorder level."""
    alerts = []
    for stock in db.query(MaterialStock).all():
        available = stock.qty_on_hand - stock.qty_reserved
        if available <= stock.material.reorder_level:
            alerts.append({
                "material_id":   stock.material_id,
                "material_name": stock.material.name,
                "warehouse_id":  stock.warehouse_id,
                "qty_available": available,
                "reorder_level": stock.material.reorder_level,
            })
    return alerts

@router.post("/usage", status_code=201)
def report_usage(
    payload: MaterialUsageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """TL reports material consumption — auto-deducts from warehouse stock."""
    usage = MaterialUsage(reported_by_id=current_user.id, **payload.model_dump())
    db.add(usage)

    # Deduct from stock (first warehouse in district that has enough)
    from app.models.user import Warehouse
    team_district = db.query(User).filter_by(id=current_user.id).first().district_id
    stock = (
        db.query(MaterialStock)
        .join(Warehouse)
        .filter(
            MaterialStock.material_id == payload.material_id,
            Warehouse.district_id == team_district,
            MaterialStock.qty_on_hand >= payload.qty_used,
        )
        .first()
    )
    if not stock:
        raise HTTPException(400, "Insufficient stock in district warehouse")
    stock.qty_on_hand -= payload.qty_used
    db.commit()
    return {"message": "Usage recorded", "remaining": stock.qty_on_hand}
