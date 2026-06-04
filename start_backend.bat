@echo off
title PrimeGate Backend
color 0A

:: Try D: drive first, then C:
if exist "D:\OSP_Project_v2\OSP Project\backend\app\main.py" (
    set PROJECT=D:\OSP_Project_v2\OSP Project
) else if exist "C:\Users\mahmo\OneDrive\Desktop\OSP_Project_v2\OSP Project\backend\app\main.py" (
    set PROJECT=C:\Users\mahmo\OneDrive\Desktop\OSP_Project_v2\OSP Project
) else (
    echo ERROR: Project not found on C: or D:
    echo Edit this file and set the correct path
    pause & exit /b 1
)

echo Found project at: %PROJECT%
cd "%PROJECT%\backend"

if not exist venv\Scripts\activate.bat (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat

echo Installing packages...
pip install -q fastapi "uvicorn[standard]" sqlalchemy alembic "pydantic[email]" email-validator pydantic-settings "python-jose[cryptography]" "passlib[bcrypt]" python-multipart psycopg2-binary

if not exist .env (
    (
        echo DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/primegate_osp
        echo SECRET_KEY=primegate-secret-key-2026
        echo ALGORITHM=HS256
        echo ACCESS_TOKEN_EXPIRE_MINUTES=480
        echo REFRESH_TOKEN_EXPIRE_DAYS=7
        echo DEFAULT_GEOFENCE_RADIUS_M=500
        echo GEOFENCE_ALERT_MINUTES=120
        echo AWS_ACCESS_KEY_ID=
        echo AWS_SECRET_ACCESS_KEY=
        echo AWS_S3_BUCKET=primegate-osp-photos
        echo AWS_REGION=me-south-1
    ) > .env
    echo Created .env
)

echo Running seed...
venv\Scripts\python.exe seed.py 2>nul

echo.
echo  ================================
echo   Backend: http://localhost:8000
echo   Docs:    http://localhost:8000/docs
echo   Ctrl+C to stop
echo  ================================
echo.
uvicorn app.main:app --reload --port 8000
pause
