import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum, Text, Date, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class UserRole(str, enum.Enum):
    MANAGEMENT       = "management"
    DISTRICT_MANAGER = "district_manager"
    SUPERVISOR       = "supervisor"
    TEAM_LEADER      = "team_leader"

class TeamType(str, enum.Enum):
    CIVIL  = "Civil"
    FIBER  = "Fiber"
    DESIGN = "Design"

class TeamStatus(str, enum.Enum):
    ONSITE  = "onsite"
    TRANSIT = "transit"
    OFFICE  = "office"

class WOMilestone(str, enum.Enum):
    DESIGN         = "Design"
    PERMIT         = "Permit"
    IMPLEMENTATION = "Implementation"
    PAT            = "PAT"
    ASBUILT        = "Asbuilt"

class ShiftType(str, enum.Enum):
    AM = "AM"
    PM = "PM"

class ApprovalStatus(str, enum.Enum):
    PENDING  = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class ExpenseCategory(str, enum.Enum):
    FUEL             = "Fuel"
    ACCOMMODATION    = "Accommodation"
    EQUIPMENT_RENTAL = "Equipment Rental"
    FOOD             = "Food"
    MISCELLANEOUS    = "Miscellaneous"


class District(Base):
    __tablename__ = "districts"
    id         = Column(Integer, primary_key=True)
    name       = Column(String(100), nullable=False)
    region     = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)

    users       = relationship("User", back_populates="district")
    teams       = relationship("Team", back_populates="district")
    work_orders = relationship("WorkOrder", back_populates="district")
    warehouses  = relationship("Warehouse", back_populates="district")


class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(100), nullable=False)
    email         = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role          = Column(Enum(UserRole), nullable=False)
    phone         = Column(String(20))
    district_id   = Column(Integer, ForeignKey("districts.id"), nullable=True)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

    district      = relationship("District", back_populates="users")
    led_teams     = relationship("Team", back_populates="leader",     foreign_keys="Team.leader_id")
    supervised    = relationship("Team", back_populates="supervisor", foreign_keys="Team.supervisor_id")
    daily_reports = relationship("DailyPlanEntry", back_populates="submitted_by")
    # Fix: explicit foreign_keys for both expense relationships
    submitted_expenses = relationship("SiteExpense", back_populates="submitted_by", foreign_keys="SiteExpense.submitted_by_id")
    approved_expenses  = relationship("SiteExpense", back_populates="approved_by",  foreign_keys="SiteExpense.approved_by_id")


class Team(Base):
    __tablename__ = "teams"
    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(100), nullable=False)
    type          = Column(Enum(TeamType), nullable=False)
    district_id   = Column(Integer, ForeignKey("districts.id"), nullable=False)
    area          = Column(String(150))
    leader_id     = Column(Integer, ForeignKey("users.id"), nullable=True)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status        = Column(Enum(TeamStatus), default=TeamStatus.OFFICE)
    last_lat      = Column(Float, nullable=True)
    last_lng      = Column(Float, nullable=True)
    last_seen_at  = Column(DateTime, nullable=True)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

    district     = relationship("District", back_populates="teams")
    leader       = relationship("User", back_populates="led_teams",    foreign_keys=[leader_id])
    supervisor   = relationship("User", back_populates="supervised",   foreign_keys=[supervisor_id])
    members      = relationship("TeamMember", back_populates="team")
    assignments  = relationship("TeamWorkOrderAssignment", back_populates="team")
    daily_plans  = relationship("DailyPlan", back_populates="team")
    expenses     = relationship("SiteExpense", back_populates="team")


class TeamMember(Base):
    __tablename__ = "team_members"
    id        = Column(Integer, primary_key=True)
    team_id   = Column(Integer, ForeignKey("teams.id"), nullable=False)
    user_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    team      = relationship("Team", back_populates="members")
    user      = relationship("User")


class WorkOrder(Base):
    __tablename__ = "work_orders"
    id                  = Column(Integer, primary_key=True, index=True)
    wo_number           = Column(String(20), unique=True, nullable=False)
    title               = Column(String(255), nullable=False)
    district_id         = Column(Integer, ForeignKey("districts.id"), nullable=False)
    district_manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    milestone           = Column(Enum(WOMilestone), default=WOMilestone.DESIGN)
    location_address    = Column(String(255))
    location_lat        = Column(Float)
    location_lng        = Column(Float)
    geofence_radius_m   = Column(Integer, default=500)
    start_date          = Column(Date)
    end_date            = Column(Date)
    notes               = Column(Text)
    is_active           = Column(Boolean, default=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    district         = relationship("District", back_populates="work_orders")
    district_manager = relationship("User", foreign_keys=[district_manager_id])
    team_assignments = relationship("TeamWorkOrderAssignment", back_populates="work_order")
    boq_items        = relationship("BOQItem", back_populates="work_order")
    daily_plans      = relationship("DailyPlan", back_populates="work_order")
    expenses         = relationship("SiteExpense", back_populates="work_order")


class TeamWorkOrderAssignment(Base):
    __tablename__ = "team_wo_assignments"
    id            = Column(Integer, primary_key=True)
    team_id       = Column(Integer, ForeignKey("teams.id"), nullable=False)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    assigned_at   = Column(DateTime, default=datetime.utcnow)
    is_active     = Column(Boolean, default=True)
    team          = relationship("Team", back_populates="assignments")
    work_order    = relationship("WorkOrder", back_populates="team_assignments")


class BOQItem(Base):
    __tablename__ = "boq_items"
    id            = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    item_code     = Column(String(50))
    description   = Column(String(255), nullable=False)
    unit          = Column(String(30), nullable=False)
    qty_planned   = Column(Float, nullable=False)
    unit_price    = Column(Float, default=0)
    phase         = Column(Enum(WOMilestone), default=WOMilestone.IMPLEMENTATION)
    created_at    = Column(DateTime, default=datetime.utcnow)

    work_order    = relationship("WorkOrder", back_populates="boq_items")
    daily_entries = relationship("DailyPlanEntry", back_populates="boq_item")

    @property
    def total_value(self):
        return self.qty_planned * self.unit_price


class DailyPlan(Base):
    __tablename__ = "daily_plans"
    id                  = Column(Integer, primary_key=True, index=True)
    team_id             = Column(Integer, ForeignKey("teams.id"), nullable=False)
    work_order_id       = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    plan_date           = Column(Date, nullable=False)
    shift               = Column(Enum(ShiftType), nullable=False)
    created_by_id       = Column(Integer, ForeignKey("users.id"))
    created_at          = Column(DateTime, default=datetime.utcnow)
    tl_submitted_at     = Column(DateTime, nullable=True)
    tl_notes            = Column(Text)
    sup_approved_at     = Column(DateTime, nullable=True)
    sup_approved_by_id  = Column(Integer, ForeignKey("users.id"), nullable=True)
    sup_notes           = Column(Text)
    dm_received_at      = Column(DateTime, nullable=True)
    status              = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING)
    check_in_at         = Column(DateTime, nullable=True)
    check_in_lat        = Column(Float, nullable=True)
    check_in_lng        = Column(Float, nullable=True)
    check_in_photo_url  = Column(String(500), nullable=True)
    check_out_at        = Column(DateTime, nullable=True)
    check_out_lat       = Column(Float, nullable=True)
    check_out_lng       = Column(Float, nullable=True)
    check_out_photo_url = Column(String(500), nullable=True)

    team             = relationship("Team", back_populates="daily_plans")
    work_order       = relationship("WorkOrder", back_populates="daily_plans")
    created_by       = relationship("User", foreign_keys=[created_by_id])
    sup_approved_by  = relationship("User", foreign_keys=[sup_approved_by_id])
    entries          = relationship("DailyPlanEntry", back_populates="daily_plan")


class DailyPlanEntry(Base):
    __tablename__ = "daily_plan_entries"
    id              = Column(Integer, primary_key=True)
    daily_plan_id   = Column(Integer, ForeignKey("daily_plans.id"), nullable=False)
    boq_item_id     = Column(Integer, ForeignKey("boq_items.id"), nullable=False)
    qty_planned     = Column(Float, nullable=False)
    qty_actual      = Column(Float, nullable=True)
    photo_urls      = Column(JSON, default=list)
    tl_notes        = Column(Text)
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    submitted_at    = Column(DateTime, nullable=True)

    daily_plan   = relationship("DailyPlan", back_populates="entries")
    boq_item     = relationship("BOQItem", back_populates="daily_entries")
    submitted_by = relationship("User", back_populates="daily_reports")


class Warehouse(Base):
    __tablename__ = "warehouses"
    id          = Column(Integer, primary_key=True)
    name        = Column(String(100), nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    address     = Column(String(255))
    created_at  = Column(DateTime, default=datetime.utcnow)
    district    = relationship("District", back_populates="warehouses")
    stock       = relationship("MaterialStock", back_populates="warehouse")


class Material(Base):
    __tablename__ = "materials"
    id            = Column(Integer, primary_key=True)
    name          = Column(String(150), nullable=False)
    item_code     = Column(String(50), unique=True)
    unit          = Column(String(30), nullable=False)
    reorder_level = Column(Float, default=0)
    created_at    = Column(DateTime, default=datetime.utcnow)
    stock         = relationship("MaterialStock", back_populates="material")
    usage_logs    = relationship("MaterialUsage", back_populates="material")


class MaterialStock(Base):
    __tablename__ = "material_stock"
    id           = Column(Integer, primary_key=True)
    material_id  = Column(Integer, ForeignKey("materials.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    qty_on_hand  = Column(Float, default=0)
    qty_reserved = Column(Float, default=0)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    material     = relationship("Material", back_populates="stock")
    warehouse    = relationship("Warehouse", back_populates="stock")

    @property
    def qty_available(self):
        return self.qty_on_hand - self.qty_reserved


class MaterialUsage(Base):
    __tablename__ = "material_usage"
    id             = Column(Integer, primary_key=True)
    material_id    = Column(Integer, ForeignKey("materials.id"), nullable=False)
    work_order_id  = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    team_id        = Column(Integer, ForeignKey("teams.id"), nullable=False)
    qty_used       = Column(Float, nullable=False)
    usage_date     = Column(Date, nullable=False)
    reported_by_id = Column(Integer, ForeignKey("users.id"))
    notes          = Column(Text)
    created_at     = Column(DateTime, default=datetime.utcnow)
    material       = relationship("Material", back_populates="usage_logs")
    work_order     = relationship("WorkOrder")
    team           = relationship("Team")
    reported_by    = relationship("User")


class SiteExpense(Base):
    __tablename__ = "site_expenses"
    id               = Column(Integer, primary_key=True, index=True)
    team_id          = Column(Integer, ForeignKey("teams.id"), nullable=False)
    work_order_id    = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    expense_date     = Column(Date, nullable=False)
    category         = Column(Enum(ExpenseCategory), nullable=False)
    description      = Column(String(255), nullable=False)
    amount_sar       = Column(Float, nullable=False)
    receipt_url      = Column(String(500))
    submitted_by_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    status           = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING)
    approved_by_id   = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at      = Column(DateTime, nullable=True)
    rejection_reason = Column(Text)
    created_at       = Column(DateTime, default=datetime.utcnow)

    team         = relationship("Team", back_populates="expenses")
    work_order   = relationship("WorkOrder", back_populates="expenses")
    # Fix: explicit foreign_keys to resolve ambiguity
    submitted_by = relationship("User", foreign_keys=[submitted_by_id], back_populates="submitted_expenses")
    approved_by  = relationship("User", foreign_keys=[approved_by_id],  back_populates="approved_expenses")
