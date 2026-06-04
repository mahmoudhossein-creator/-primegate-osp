# PrimeGate OSP — Project Architecture

## Tech Stack
| Layer      | Technology              |
|------------|------------------------|
| Frontend   | Next.js 14 (App Router) |
| Backend    | FastAPI (Python 3.11)   |
| Database   | PostgreSQL 15           |
| Mobile     | React Native (Expo)     |
| Auth       | JWT + Role-based RBAC   |
| Geo-fence  | Haversine (built-in)    |
| Storage    | AWS S3 (photos/receipts)|
| ERP        | Microsoft Dynamics 365  |

## Folder Structure
```
OSP Project/
├── backend/                     ← FastAPI
│   ├── app/
│   │   ├── main.py              ← App entry + CORS + routers
│   │   ├── core/
│   │   │   ├── config.py        ← Environment variables
│   │   │   ├── database.py      ← PostgreSQL session
│   │   │   └── security.py      ← JWT + role guards
│   │   ├── models/
│   │   │   └── user.py          ← ALL SQLAlchemy models
│   │   ├── schemas/
│   │   │   └── schemas.py       ← ALL Pydantic schemas
│   │   ├── routers/
│   │   │   ├── auth.py          ← Login / register / me
│   │   │   ├── teams.py         ← Teams CRUD + GPS status
│   │   │   ├── work_orders.py   ← WOs CRUD + milestone + assign
│   │   │   ├── daily_plans.py   ← Plans + check-in + submit + approve
│   │   │   ├── boq.py           ← BOQ items CRUD
│   │   │   ├── materials.py     ← Stock + usage + shortage alerts
│   │   │   ├── expenses.py      ← Site expenses + approval
│   │   │   └── reports.py       ← Dashboard KPIs + charts data
│   │   └── services/
│   │       └── geo_fence.py     ← Haversine geo-fence check
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
│
├── frontend/                    ← Next.js (coming next)
├── mobile/                      ← React Native (coming next)
└── ARCHITECTURE.md              ← This file
