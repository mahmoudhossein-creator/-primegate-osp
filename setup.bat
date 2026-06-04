@echo off
:: ============================================================
::  PrimeGate OSP — Setup Script (Windows)
::  شغّله بـ Run as Administrator
:: ============================================================

title PrimeGate OSP Setup
color 0A
echo.
echo  ==========================================
echo    PrimeGate OSP -- Windows Setup
echo  ==========================================
echo.

:: ── Check Python ──────────────────────────────────────────
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found.
    echo Install from: https://python.org/downloads
    echo Make sure to check "Add Python to PATH"
    pause & exit /b 1
)
echo [OK] Python found

:: ── Check Node ────────────────────────────────────────────
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found.
    echo Install from: https://nodejs.org
    pause & exit /b 1
)
echo [OK] Node.js found

:: ── Check PostgreSQL ──────────────────────────────────────
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] PostgreSQL not found.
    echo Download: https://www.postgresql.org/download/windows/
    echo After installing, add bin folder to PATH and restart this script.
    echo Default path: C:\Program Files\PostgreSQL\16\bin
    echo.
    pause
)

:: ── Create Database ───────────────────────────────────────
echo.
echo Creating database...
createdb primegate_osp 2>nul
echo [OK] Database ready

:: ── Backend Setup ─────────────────────────────────────────
echo.
echo Setting up Backend...
cd backend

python -m venv venv
call venv\Scripts\activate.bat

pip install -q --upgrade pip
pip install -q -r requirements.txt
echo [OK] Backend packages installed

if not exist .env (
    copy .env.example .env
    echo [OK] .env created - Edit DATABASE_URL password if needed
) else (
    echo [SKIP] .env already exists
)

alembic upgrade head
echo [OK] Database migrations done

cd ..

:: ── Frontend Setup ────────────────────────────────────────
echo.
echo Setting up Frontend...
cd frontend
npm install --silent

if not exist .env.local (
    echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local
    echo [OK] .env.local created
)
echo [OK] Frontend packages installed
cd ..

:: ── Mobile Setup ──────────────────────────────────────────
echo.
echo Setting up Mobile...
cd mobile
npm install --silent
echo [OK] Mobile packages installed
cd ..

:: ── Done ──────────────────────────────────────────────────
echo.
echo  ==========================================
echo    Setup Complete!
echo  ==========================================
echo.
echo  Open 3 Command Prompts and run:
echo.
echo  [1] Backend:
echo      cd backend
echo      venv\Scripts\activate
echo      uvicorn app.main:app --reload --port 8000
echo      Open: http://localhost:8000/docs
echo.
echo  [2] Frontend:
echo      cd frontend
echo      npm run dev
echo      Open: http://localhost:3000
echo.
echo  [3] Mobile:
echo      cd mobile
echo      npx expo start
echo      Scan QR with Expo Go app
echo.
pause
