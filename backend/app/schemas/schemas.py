"""Pydantic v2 schemas — request/response shapes for all endpoints."""
from __future__ import annotations
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator
from app.models.user import (
    UserRole, TeamType, TeamStatus, WOMilestone,
    ShiftType, ApprovalStatus, ExpenseCategory,
)


# ── Auth ──────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    district_id: Optional[int]
    model_config = {"from_attributes": True}

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole
    phone: Optional[str] = None
    district_id: Optional[int] = None


# ── District ──────────────────────────────────────────────────

class DistrictOut(BaseModel):
    id: int
    name: str
    region: Optional[str]
    model_config = {"from_attributes": True}


# ── Team ──────────────────────────────────────────────────────

class TeamCreate(BaseModel):
    name: str
    type: TeamType
    district_id: int
    area: Optional[str] = None
    leader_id: Optional[int] = None
    supervisor_id: Optional[int] = None

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    area: Optional[str] = None
    status: Optional[TeamStatus] = None
    leader_id: Optional[int] = None
    supervisor_id: Optional[int] = None

class TeamMemberOut(BaseModel):
    id: int
    name: str
    role: UserRole
    model_config = {"from_attributes": True}

class TeamOut(BaseModel):
    id: int
    name: str
    type: TeamType
    district_id: int
    district: Optional[DistrictOut]
    area: Optional[str]
    status: TeamStatus
    last_lat: Optional[float]
    last_lng: Optional[float]
    last_seen_at: Optional[datetime]
    members: List[TeamMemberOut] = []
    model_config = {"from_attributes": True}

class TeamStatusUpdate(BaseModel):
    status: TeamStatus
    lat: Optional[float] = None
    lng: Optional[float] = None


# ── Work Order ────────────────────────────────────────────────

class WorkOrderCreate(BaseModel):
    wo_number: str
    title: str
    district_id: int
    district_manager_id: Optional[int] = None
    location_address: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    geofence_radius_m: int = 500
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None

class WorkOrderMilestoneUpdate(BaseModel):
    milestone: WOMilestone

class WorkOrderOut(BaseModel):
    id: int
    wo_number: str
    title: str
    district_id: int
    milestone: WOMilestone
    location_address: Optional[str]
    location_lat: Optional[float]
    location_lng: Optional[float]
    geofence_radius_m: int
    start_date: Optional[date]
    end_date: Optional[date]
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class AssignTeamRequest(BaseModel):
    team_id: int


# ── BOQ ───────────────────────────────────────────────────────

class BOQItemCreate(BaseModel):
    item_code: Optional[str] = None
    description: str
    unit: str
    qty_planned: float
    unit_price: float = 0
    phase: WOMilestone = WOMilestone.IMPLEMENTATION

class BOQItemOut(BaseModel):
    id: int
    work_order_id: int
    item_code: Optional[str]
    description: str
    unit: str
    qty_planned: float
    unit_price: float
    phase: WOMilestone
    total_value: float
    model_config = {"from_attributes": True}


# ── Daily Plan ────────────────────────────────────────────────

class DailyPlanEntryIn(BaseModel):
    boq_item_id: int
    qty_planned: float

class DailyPlanCreate(BaseModel):
    team_id: int
    work_order_id: int
    plan_date: date
    shift: ShiftType
    entries: List[DailyPlanEntryIn]

class ActualEntryIn(BaseModel):
    boq_item_id: int
    qty_actual: float
    photo_urls: List[str] = []
    tl_notes: Optional[str] = None

class TLSubmitRequest(BaseModel):
    entries: List[ActualEntryIn]
    tl_notes: Optional[str] = None

class SupervisorApproveRequest(BaseModel):
    approved: bool
    notes: Optional[str] = None

class CheckInRequest(BaseModel):
    lat: float
    lng: float
    photo_url: Optional[str] = None

class DailyPlanEntryOut(BaseModel):
    id: int
    boq_item_id: int
    boq_description: Optional[str] = None
    unit: Optional[str] = None
    qty_planned: float
    qty_actual: Optional[float]
    photo_urls: List[str]
    model_config = {"from_attributes": True}

class DailyPlanOut(BaseModel):
    id: int
    team_id: int
    work_order_id: int
    plan_date: date
    shift: ShiftType
    status: ApprovalStatus
    tl_submitted_at: Optional[datetime]
    sup_approved_at: Optional[datetime]
    dm_received_at: Optional[datetime]
    check_in_at: Optional[datetime]
    check_out_at: Optional[datetime]
    entries: List[DailyPlanEntryOut] = []
    model_config = {"from_attributes": True}


# ── Materials ─────────────────────────────────────────────────

class MaterialCreate(BaseModel):
    name: str
    item_code: Optional[str] = None
    unit: str
    reorder_level: float = 0

class MaterialStockOut(BaseModel):
    warehouse_id: int
    warehouse_name: Optional[str]
    qty_on_hand: float
    qty_reserved: float
    qty_available: float
    model_config = {"from_attributes": True}

class MaterialOut(BaseModel):
    id: int
    name: str
    item_code: Optional[str]
    unit: str
    reorder_level: float
    stock: List[MaterialStockOut] = []
    model_config = {"from_attributes": True}

class MaterialUsageCreate(BaseModel):
    material_id: int
    work_order_id: int
    team_id: int
    qty_used: float
    usage_date: date
    notes: Optional[str] = None


# ── Site Expenses ─────────────────────────────────────────────

class ExpenseCreate(BaseModel):
    team_id: int
    work_order_id: int
    expense_date: date
    category: ExpenseCategory
    description: str
    amount_sar: float
    receipt_url: Optional[str] = None

    @field_validator("amount_sar")
    @classmethod
    def positive_amount(cls, v):
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v

class ExpenseApproveRequest(BaseModel):
    approved: bool
    rejection_reason: Optional[str] = None

class ExpenseOut(BaseModel):
    id: int
    team_id: int
    work_order_id: int
    expense_date: date
    category: ExpenseCategory
    description: str
    amount_sar: float
    receipt_url: Optional[str]
    status: ApprovalStatus
    submitted_by: Optional[UserOut]
    approved_by: Optional[UserOut]
    approved_at: Optional[datetime]
    rejection_reason: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Reports ───────────────────────────────────────────────────

class TeamSummary(BaseModel):
    team_id: int
    team_name: str
    team_type: TeamType
    district: str
    status: TeamStatus
    active_wos: int
    today_plan_set: bool
    today_submitted: bool
    today_approved: bool

class DistrictReport(BaseModel):
    district_id: int
    district_name: str
    total_teams: int
    teams_onsite: int
    total_wos: int
    total_expenses_sar: float
    pending_approvals: int
