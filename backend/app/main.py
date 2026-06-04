from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.routers import auth, teams, work_orders, daily_plans, boq, materials, expenses, reports

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PrimeGate OSP API",
    description="Work Orders Management System — Outside Plant Operations KSA",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,        prefix="/api/auth",        tags=["Auth"])
app.include_router(teams.router,       prefix="/api/teams",       tags=["Teams"])
app.include_router(work_orders.router, prefix="/api/work-orders", tags=["Work Orders"])
app.include_router(daily_plans.router, prefix="/api/daily-plans", tags=["Daily Plans"])
app.include_router(boq.router,         prefix="/api/boq",         tags=["BOQ"])
app.include_router(materials.router,   prefix="/api/materials",   tags=["Materials"])
app.include_router(expenses.router,    prefix="/api/expenses",    tags=["Expenses"])
app.include_router(reports.router,     prefix="/api/reports",     tags=["Reports"])

@app.get("/")
def root():
    return {"status": "PrimeGate OSP API is running", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "healthy"}
