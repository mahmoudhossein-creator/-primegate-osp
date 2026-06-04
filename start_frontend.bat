@echo off
title PrimeGate Frontend
color 0B

if exist "D:\OSP_Project_v2\OSP Project\frontend\package.json" (
    set PROJECT=D:\OSP_Project_v2\OSP Project
) else if exist "C:\Users\mahmo\OneDrive\Desktop\OSP_Project_v2\OSP Project\frontend\package.json" (
    set PROJECT=C:\Users\mahmo\OneDrive\Desktop\OSP_Project_v2\OSP Project
) else (
    echo ERROR: Project not found
    pause & exit /b 1
)

echo Found project at: %PROJECT%
cd "%PROJECT%\frontend"

if not exist .env.local (
    echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local
)

if not exist node_modules (
    echo Installing packages (2-3 minutes)...
    npm install
)

echo.
echo  ================================
echo   Frontend: http://localhost:3000
echo   Ctrl+C to stop
echo  ================================
echo.
npm run dev
pause
