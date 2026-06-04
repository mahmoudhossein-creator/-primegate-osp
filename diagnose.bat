@echo off
:: PrimeGate OSP — Windows Backend Diagnostic
:: شغّله من داخل فولدر OSP Project
title PrimeGate Diagnostic
color 0E
echo.
echo ================================================
echo   PrimeGate OSP - Backend Diagnostic (Windows)
echo ================================================
echo.

set ERRORS=0

:: ── 1. Python ────────────────────────────────────
echo [1] Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    py --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo     ERROR: Python not found in PATH
        echo     Fix: https://python.org/downloads
        echo           Make sure to check "Add Python to PATH"
        set /a ERRORS+=1
    ) else (
        echo     OK: Python found via 'py' command
        set PYTHON_CMD=py
    )
) else (
    for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo     OK: %%v
    set PYTHON_CMD=python
)

:: ── 2. pip ───────────────────────────────────────
echo.
echo [2] Checking pip...
%PYTHON_CMD% -m pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo     ERROR: pip not found
    echo     Fix: %PYTHON_CMD% -m ensurepip --upgrade
    set /a ERRORS+=1
) else (
    for /f "tokens=*" %%v in ('%PYTHON_CMD% -m pip --version 2^>^&1') do echo     OK: %%v
)

:: ── 3. Virtual Environment ───────────────────────
echo.
echo [3] Checking virtual environment...
if exist backend\venv\Scripts\activate.bat (
    echo     OK: venv found at backend\venv
) else (
    echo     WARNING: venv not found, will create it
)

:: ── 4. PostgreSQL ────────────────────────────────
echo.
echo [4] Checking PostgreSQL...
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo     ERROR: PostgreSQL not found in PATH
    echo     Fix options:
    echo       A) Install: https://www.postgresql.org/download/windows/
    echo       B) OR use SQLite instead (easier - no install needed)
    set /a ERRORS+=1
    set PG_MISSING=1
) else (
    for /f "tokens=*" %%v in ('psql --version 2^>^&1') do echo     OK: %%v
    set PG_MISSING=0
)

:: ── 5. Check backend folder ──────────────────────
echo.
echo [5] Checking project structure...
if not exist backend\app\main.py (
    echo     ERROR: backend\app\main.py not found
    echo     Make sure you're running this from inside "OSP Project" folder
    set /a ERRORS+=1
) else (
    echo     OK: backend files found
)
if not exist backend\requirements.txt (
    echo     ERROR: backend\requirements.txt not found
    set /a ERRORS+=1
) else (
    echo     OK: requirements.txt found
)

:: ── 6. Check .env ────────────────────────────────
echo.
echo [6] Checking .env file...
if not exist backend\.env (
    echo     WARNING: backend\.env not found, will create from example
) else (
    echo     OK: .env found
    findstr /i "DATABASE_URL" backend\.env >nul 2>&1
    if %errorlevel% neq 0 (
        echo     ERROR: DATABASE_URL missing from .env
        set /a ERRORS+=1
    ) else (
        echo     OK: DATABASE_URL present
    )
)

:: ── 7. Try installing packages ───────────────────
echo.
echo [7] Installing backend packages...
if not exist backend\venv\Scripts\activate.bat (
    echo     Creating virtual environment...
    cd backend
    %PYTHON_CMD% -m venv venv
    cd ..
)

call backend\venv\Scripts\activate.bat 2>nul
if %errorlevel% neq 0 (
    echo     ERROR: Could not activate venv
    set /a ERRORS+=1
    goto :summary
)

echo     Installing packages from requirements.txt...
cd backend
pip install -q -r requirements.txt 2>nul
if %errorlevel% neq 0 (
    echo     ERROR: pip install failed
    echo     Try: pip install -r requirements.txt (without -q to see errors)
    set /a ERRORS+=1
) else (
    echo     OK: All packages installed
)
cd ..

:: ── 8. Fix .env if missing ───────────────────────
echo.
echo [8] Setting up .env...
if not exist backend\.env (
    copy backend\.env.example backend\.env >nul
    echo     OK: .env created from template
)

:: ── 9. Switch to SQLite if PostgreSQL missing ────
echo.
if "%PG_MISSING%"=="1" (
    echo [9] PostgreSQL missing -- Switching to SQLite (no install needed)...
    powershell -Command "(gc backend\.env) -replace 'DATABASE_URL=postgresql.*', 'DATABASE_URL=sqlite:///./primegate.db' | sc backend\.env"
    echo     OK: Switched to SQLite database
    echo     (SQLite is fine for testing -- switch to PostgreSQL for production)
) else (
    echo [9] PostgreSQL available -- keeping PostgreSQL config
)

:: ── 10. Run Alembic migrations ───────────────────
echo.
echo [10] Running database migrations...
cd backend
call venv\Scripts\activate.bat
alembic upgrade head 2>nul
if %errorlevel% neq 0 (
    echo     WARNING: Migration had issues (may be OK if db already exists)
    echo     Try manually: cd backend ^& alembic upgrade head
) else (
    echo     OK: Database ready
)
cd ..

:: ── Summary ──────────────────────────────────────
:summary
echo.
echo ================================================
if %ERRORS%==0 (
    echo   All checks passed!
    echo.
    echo   To start the backend:
    echo     cd backend
    echo     venv\Scripts\activate
    echo     uvicorn app.main:app --reload --port 8000
    echo.
    echo   Then open: http://localhost:8000/docs
) else (
    echo   Found %ERRORS% issue(s) -- see above
)
echo ================================================
echo.
pause
