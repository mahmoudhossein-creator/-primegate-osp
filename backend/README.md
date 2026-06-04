# PrimeGate OSP — Backend Setup

## Prerequisites
- Python 3.11+
- PostgreSQL 15+

## Quick Start

```bash
# 1. Clone & enter backend
cd primegate/backend

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL and SECRET_KEY

# 5. Create database
createdb primegate_osp

# 6. Run (tables created automatically on first start)
uvicorn app.main:app --reload --port 8000
```

## API Docs
- Swagger UI: http://localhost:8000/docs
- ReDoc:       http://localhost:8000/redoc

## Endpoints Summary

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | /api/auth/login | All | Get JWT token |
| GET | /api/auth/me | All | Current user |
| POST | /api/auth/register | Management | Create user |
| GET | /api/teams/ | All | List teams (filter: district, type, status) |
| POST | /api/teams/ | DM+ | Create team |
| PATCH | /api/teams/{id}/status | All | Update GPS status (mobile) |
| POST | /api/teams/{id}/members/{uid} | DM+ | Add member |
| GET | /api/work-orders/ | All | List WOs (filter: district, milestone) |
| POST | /api/work-orders/ | DM+ | Create WO |
| PATCH | /api/work-orders/{id}/milestone | DM+ | Advance milestone |
| POST | /api/work-orders/{id}/assign-team | DM+ | Assign team to WO |
| POST | /api/boq/work-orders/{wo_id}/boq | DM+ | Add BOQ item |
| GET | /api/boq/work-orders/{wo_id}/boq | All | List BOQ items |
| POST | /api/daily-plans/ | DM+ | Create daily plan (AM or PM shift) |
| GET | /api/daily-plans/ | All | List plans (filter: team, WO, date) |
| POST | /api/daily-plans/{id}/check-in | All | TL checks in with GPS+photo |
| POST | /api/daily-plans/{id}/check-out | All | TL checks out |
| POST | /api/daily-plans/{id}/submit | TL+ | TL submits actual quantities |
| POST | /api/daily-plans/{id}/supervisor-approve | Supervisor+ | Approve/reject → auto-sends to DM |
| GET | /api/materials/ | All | List materials (filter: low_stock_only) |
| GET | /api/materials/shortage-alerts | All | Low stock alerts |
| POST | /api/materials/usage | All | Report material usage |
| GET | /api/expenses/ | All | List expenses |
| POST | /api/expenses/ | All | Submit expense |
| GET | /api/expenses/summary | All | Totals by category & district |
| PATCH | /api/expenses/{id}/approve | DM+ | Approve/reject expense |
| GET | /api/reports/dashboard-summary | All | Dashboard KPIs |
| GET | /api/reports/teams-distribution | All | 3 chart data |
| GET | /api/reports/achievements | All | Financial achievement totals |

## Approval Flow
```
TL submits  →  Supervisor approves  →  DM auto-receives
(mobile)        (/supervisor-approve)   (dm_received_at set automatically)
```

## Geo-fence
Check-in validates that the team's GPS coordinates are within
`geofence_radius_m` metres of the work order location.
Implemented with Haversine formula — no external service required.
```
