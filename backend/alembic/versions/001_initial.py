"""Initial migration — create all tables.

Revision ID: 001
Create Date: 2026-05-23
"""
from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # districts
    op.create_table("districts",
        sa.Column("id",         sa.Integer, primary_key=True),
        sa.Column("name",       sa.String(100), nullable=False),
        sa.Column("region",     sa.String(100)),
        sa.Column("created_at", sa.DateTime),
    )

    # users
    op.create_table("users",
        sa.Column("id",            sa.Integer, primary_key=True),
        sa.Column("name",          sa.String(100), nullable=False),
        sa.Column("email",         sa.String(150), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role",          sa.String(30),  nullable=False),
        sa.Column("phone",         sa.String(20)),
        sa.Column("district_id",   sa.Integer, sa.ForeignKey("districts.id")),
        sa.Column("is_active",     sa.Boolean, default=True),
        sa.Column("created_at",    sa.DateTime),
    )

    # teams
    op.create_table("teams",
        sa.Column("id",            sa.Integer, primary_key=True),
        sa.Column("name",          sa.String(100), nullable=False),
        sa.Column("type",          sa.String(20),  nullable=False),
        sa.Column("district_id",   sa.Integer, sa.ForeignKey("districts.id"), nullable=False),
        sa.Column("area",          sa.String(150)),
        sa.Column("leader_id",     sa.Integer, sa.ForeignKey("users.id")),
        sa.Column("supervisor_id", sa.Integer, sa.ForeignKey("users.id")),
        sa.Column("status",        sa.String(20), default="office"),
        sa.Column("last_lat",      sa.Float),
        sa.Column("last_lng",      sa.Float),
        sa.Column("last_seen_at",  sa.DateTime),
        sa.Column("is_active",     sa.Boolean, default=True),
        sa.Column("created_at",    sa.DateTime),
    )

    op.create_table("team_members",
        sa.Column("id",        sa.Integer, primary_key=True),
        sa.Column("team_id",   sa.Integer, sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("user_id",   sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("joined_at", sa.DateTime),
        sa.Column("is_active", sa.Boolean, default=True),
    )

    # work orders
    op.create_table("work_orders",
        sa.Column("id",                  sa.Integer, primary_key=True),
        sa.Column("wo_number",           sa.String(20), unique=True, nullable=False),
        sa.Column("title",               sa.String(255), nullable=False),
        sa.Column("district_id",         sa.Integer, sa.ForeignKey("districts.id"), nullable=False),
        sa.Column("district_manager_id", sa.Integer, sa.ForeignKey("users.id")),
        sa.Column("milestone",           sa.String(30), default="Design"),
        sa.Column("location_address",    sa.String(255)),
        sa.Column("location_lat",        sa.Float),
        sa.Column("location_lng",        sa.Float),
        sa.Column("geofence_radius_m",   sa.Integer, default=500),
        sa.Column("start_date",          sa.Date),
        sa.Column("end_date",            sa.Date),
        sa.Column("notes",               sa.Text),
        sa.Column("is_active",           sa.Boolean, default=True),
        sa.Column("created_at",          sa.DateTime),
        sa.Column("updated_at",          sa.DateTime),
    )

    op.create_table("team_wo_assignments",
        sa.Column("id",            sa.Integer, primary_key=True),
        sa.Column("team_id",       sa.Integer, sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("work_order_id", sa.Integer, sa.ForeignKey("work_orders.id"), nullable=False),
        sa.Column("assigned_at",   sa.DateTime),
        sa.Column("is_active",     sa.Boolean, default=True),
    )

    # BOQ
    op.create_table("boq_items",
        sa.Column("id",            sa.Integer, primary_key=True),
        sa.Column("work_order_id", sa.Integer, sa.ForeignKey("work_orders.id"), nullable=False),
        sa.Column("item_code",     sa.String(50)),
        sa.Column("description",   sa.String(255), nullable=False),
        sa.Column("unit",          sa.String(30),  nullable=False),
        sa.Column("qty_planned",   sa.Float, nullable=False),
        sa.Column("unit_price",    sa.Float, default=0),
        sa.Column("phase",         sa.String(30)),
        sa.Column("created_at",    sa.DateTime),
    )

    # Daily plans
    op.create_table("daily_plans",
        sa.Column("id",                  sa.Integer, primary_key=True),
        sa.Column("team_id",             sa.Integer, sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("work_order_id",       sa.Integer, sa.ForeignKey("work_orders.id"), nullable=False),
        sa.Column("plan_date",           sa.Date, nullable=False),
        sa.Column("shift",               sa.String(5), nullable=False),
        sa.Column("created_by_id",       sa.Integer, sa.ForeignKey("users.id")),
        sa.Column("created_at",          sa.DateTime),
        sa.Column("tl_submitted_at",     sa.DateTime),
        sa.Column("tl_notes",            sa.Text),
        sa.Column("sup_approved_at",     sa.DateTime),
        sa.Column("sup_approved_by_id",  sa.Integer, sa.ForeignKey("users.id")),
        sa.Column("sup_notes",           sa.Text),
        sa.Column("dm_received_at",      sa.DateTime),
        sa.Column("status",              sa.String(20), default="pending"),
        sa.Column("check_in_at",         sa.DateTime),
        sa.Column("check_in_lat",        sa.Float),
        sa.Column("check_in_lng",        sa.Float),
        sa.Column("check_in_photo_url",  sa.String(500)),
        sa.Column("check_out_at",        sa.DateTime),
        sa.Column("check_out_lat",       sa.Float),
        sa.Column("check_out_lng",       sa.Float),
        sa.Column("check_out_photo_url", sa.String(500)),
    )

    op.create_table("daily_plan_entries",
        sa.Column("id",              sa.Integer, primary_key=True),
        sa.Column("daily_plan_id",   sa.Integer, sa.ForeignKey("daily_plans.id"), nullable=False),
        sa.Column("boq_item_id",     sa.Integer, sa.ForeignKey("boq_items.id"), nullable=False),
        sa.Column("qty_planned",     sa.Float, nullable=False),
        sa.Column("qty_actual",      sa.Float),
        sa.Column("photo_urls",      sa.JSON),
        sa.Column("tl_notes",        sa.Text),
        sa.Column("submitted_by_id", sa.Integer, sa.ForeignKey("users.id")),
        sa.Column("submitted_at",    sa.DateTime),
    )

    # Materials
    op.create_table("warehouses",
        sa.Column("id",          sa.Integer, primary_key=True),
        sa.Column("name",        sa.String(100), nullable=False),
        sa.Column("district_id", sa.Integer, sa.ForeignKey("districts.id"), nullable=False),
        sa.Column("address",     sa.String(255)),
        sa.Column("created_at",  sa.DateTime),
    )

    op.create_table("materials",
        sa.Column("id",            sa.Integer, primary_key=True),
        sa.Column("name",          sa.String(150), nullable=False),
        sa.Column("item_code",     sa.String(50), unique=True),
        sa.Column("unit",          sa.String(30), nullable=False),
        sa.Column("reorder_level", sa.Float, default=0),
        sa.Column("created_at",    sa.DateTime),
    )

    op.create_table("material_stock",
        sa.Column("id",           sa.Integer, primary_key=True),
        sa.Column("material_id",  sa.Integer, sa.ForeignKey("materials.id"), nullable=False),
        sa.Column("warehouse_id", sa.Integer, sa.ForeignKey("warehouses.id"), nullable=False),
        sa.Column("qty_on_hand",  sa.Float, default=0),
        sa.Column("qty_reserved", sa.Float, default=0),
        sa.Column("updated_at",   sa.DateTime),
    )

    op.create_table("material_usage",
        sa.Column("id",             sa.Integer, primary_key=True),
        sa.Column("material_id",    sa.Integer, sa.ForeignKey("materials.id"), nullable=False),
        sa.Column("work_order_id",  sa.Integer, sa.ForeignKey("work_orders.id"), nullable=False),
        sa.Column("team_id",        sa.Integer, sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("qty_used",       sa.Float, nullable=False),
        sa.Column("usage_date",     sa.Date, nullable=False),
        sa.Column("reported_by_id", sa.Integer, sa.ForeignKey("users.id")),
        sa.Column("notes",          sa.Text),
        sa.Column("created_at",     sa.DateTime),
    )

    # Site Expenses
    op.create_table("site_expenses",
        sa.Column("id",               sa.Integer, primary_key=True),
        sa.Column("team_id",          sa.Integer, sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("work_order_id",    sa.Integer, sa.ForeignKey("work_orders.id"), nullable=False),
        sa.Column("expense_date",     sa.Date, nullable=False),
        sa.Column("category",         sa.String(30), nullable=False),
        sa.Column("description",      sa.String(255), nullable=False),
        sa.Column("amount_sar",       sa.Float, nullable=False),
        sa.Column("receipt_url",      sa.String(500)),
        sa.Column("submitted_by_id",  sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status",           sa.String(20), default="pending"),
        sa.Column("approved_by_id",   sa.Integer, sa.ForeignKey("users.id")),
        sa.Column("approved_at",      sa.DateTime),
        sa.Column("rejection_reason", sa.Text),
        sa.Column("created_at",       sa.DateTime),
    )

    # Indexes for common queries
    op.create_index("ix_daily_plans_date",     "daily_plans",  ["plan_date"])
    op.create_index("ix_daily_plans_team",     "daily_plans",  ["team_id"])
    op.create_index("ix_site_expenses_date",   "site_expenses",["expense_date"])
    op.create_index("ix_site_expenses_status", "site_expenses",["status"])
    op.create_index("ix_work_orders_district", "work_orders",  ["district_id"])


def downgrade():
    for tbl in [
        "site_expenses","material_usage","material_stock","materials","warehouses",
        "daily_plan_entries","daily_plans","boq_items","team_wo_assignments",
        "work_orders","team_members","teams","users","districts",
    ]:
        op.drop_table(tbl)
