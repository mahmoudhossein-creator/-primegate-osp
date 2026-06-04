# PrimeGate OSP — Run Everything (PowerShell)
# كليك يمين على الملف ده واختر "Run with PowerShell"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  PrimeGate OSP - Auto Setup & Run" -ForegroundColor Cyan  
Write-Host "================================================" -ForegroundColor Cyan

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendPath  = Join-Path $ProjectRoot "backend"
$FrontendPath = Join-Path $ProjectRoot "frontend"

# ── Fix PostgreSQL PATH ──────────────────────────────
$pgPath = "C:\Program Files\PostgreSQL\16\bin"
if (Test-Path $pgPath) {
    $env:PATH += ";$pgPath"
    Write-Host "[OK] PostgreSQL added to PATH" -ForegroundColor Green
}

# ── Backend Setup ────────────────────────────────────
Write-Host "`n[1] Setting up Backend..." -ForegroundColor Yellow
Set-Location $BackendPath

# Create venv
if (-not (Test-Path "venv\Scripts\activate.ps1")) {
    Write-Host "    Creating virtual environment..."
    python -m venv venv
}

# Activate
& "venv\Scripts\Activate.ps1" 2>$null
if ($LASTEXITCODE -ne 0) {
    # Try alternative activation
    $env:VIRTUAL_ENV = "$BackendPath\venv"
    $env:PATH = "$BackendPath\venv\Scripts;" + $env:PATH
}

# Install packages
Write-Host "    Installing Python packages..."
& "venv\Scripts\pip.exe" install -q fastapi "uvicorn[standard]" sqlalchemy alembic "pydantic[email]" email-validator pydantic-settings "python-jose[cryptography]" "passlib[bcrypt]" python-multipart psycopg2-binary

# Create .env
if (-not (Test-Path ".env")) {
    @"
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/primegate_osp
SECRET_KEY=primegate-secret-key-2026-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
REFRESH_TOKEN_EXPIRE_DAYS=7
DEFAULT_GEOFENCE_RADIUS_M=500
GEOFENCE_ALERT_MINUTES=120
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=primegate-osp-photos
AWS_REGION=me-south-1
"@ | Out-File -Encoding UTF8 ".env"
    Write-Host "    [OK] .env created" -ForegroundColor Green
}

# Create DB if PostgreSQL available
try {
    & "$pgPath\createdb.exe" -U postgres primegate_osp 2>$null
    Write-Host "    [OK] Database created" -ForegroundColor Green
} catch {}

# Run migrations
Write-Host "    Running migrations..."
& "venv\Scripts\alembic.exe" upgrade head 2>$null

Write-Host "[OK] Backend ready" -ForegroundColor Green

# ── Frontend Setup ───────────────────────────────────
Write-Host "`n[2] Setting up Frontend..." -ForegroundColor Yellow
Set-Location $FrontendPath

if (-not (Test-Path ".env.local")) {
    "NEXT_PUBLIC_API_URL=http://localhost:8000" | Out-File -Encoding UTF8 ".env.local"
}

if (-not (Test-Path "node_modules")) {
    Write-Host "    Installing Node packages (2-3 minutes)..."
    npm install --silent
}
Write-Host "[OK] Frontend ready" -ForegroundColor Green

# ── Launch Both ──────────────────────────────────────
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  Launching Backend + Frontend..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend:  http://localhost:8000/docs" -ForegroundColor White
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "  (Opening browser in 10 seconds...)" -ForegroundColor Gray

# Start Backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BackendPath'; & 'venv\Scripts\uvicorn.exe' app.main:app --reload --port 8000"

# Start Frontend in new window  
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$FrontendPath'; npm run dev"

# Wait then open browser
Start-Sleep 10
Start-Process "http://localhost:3000"
Start-Sleep 5
Start-Process "http://localhost:8000/docs"

Write-Host "`n[DONE] Both servers started! Check your browser." -ForegroundColor Green
Write-Host "Press any key to exit this window..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
