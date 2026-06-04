#!/bin/bash
# ============================================================
#  PrimeGate OSP — Full Setup Script
#  يشتغل على Mac أو Linux
#  على Windows: شغّله في Git Bash أو WSL
# ============================================================

set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
err()  { echo -e "${RED}✗ $1${NC}"; exit 1; }

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   PrimeGate OSP — Setup Script       ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── 1. Check Prerequisites ─────────────────────────────────
echo "▶ Checking prerequisites..."

command -v python3 >/dev/null 2>&1 || err "Python 3 not found. Install from https://python.org"
command -v node    >/dev/null 2>&1 || err "Node.js not found. Install from https://nodejs.org"
command -v npm     >/dev/null 2>&1 || err "npm not found."
ok "Python $(python3 --version)"
ok "Node $(node --version)"
ok "npm $(npm --version)"

# ── 2. PostgreSQL Check ────────────────────────────────────
echo ""
echo "▶ Checking PostgreSQL..."
if ! command -v psql >/dev/null 2>&1; then
  warn "PostgreSQL not found."
  echo ""
  echo "Install it:"
  echo "  Mac:   brew install postgresql@16 && brew services start postgresql@16"
  echo "  Linux: sudo apt install postgresql -y && sudo service postgresql start"
  echo "  Win:   https://www.postgresql.org/download/windows/"
  echo ""
  read -p "Press Enter after installing PostgreSQL to continue..."
fi
ok "PostgreSQL $(psql --version)"

# ── 3. Create Database ─────────────────────────────────────
echo ""
echo "▶ Creating database..."
createdb primegate_osp 2>/dev/null && ok "Database 'primegate_osp' created" || warn "Database may already exist — skipping"

# ── 4. Backend Setup ───────────────────────────────────────
echo ""
echo "▶ Setting up Backend (FastAPI)..."
cd "$(dirname "$0")/backend"

python3 -m venv venv
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null

pip install -q --upgrade pip
pip install -q -r requirements.txt
ok "Backend dependencies installed"

# .env
if [ ! -f .env ]; then
  cp .env.example .env
  # Generate a secure secret key
  SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
  sed -i.bak "s/change-this-in-production-use-openssl-rand-hex-32/$SECRET/" .env
  ok ".env created with secure SECRET_KEY"
else
  warn ".env already exists — skipping"
fi

# Run migrations
alembic upgrade head
ok "Database migrations applied"

cd ..

# ── 5. Frontend Setup ──────────────────────────────────────
echo ""
echo "▶ Setting up Frontend (Next.js)..."
cd frontend
npm install --silent
if [ ! -f .env.local ]; then
  echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
  ok ".env.local created"
fi
ok "Frontend dependencies installed"
cd ..

# ── 6. Mobile Setup ───────────────────────────────────────
echo ""
echo "▶ Setting up Mobile (Expo)..."
cd mobile
npm install --silent
if ! command -v expo >/dev/null 2>&1; then
  npm install -g expo-cli --silent
fi
ok "Mobile dependencies installed"
cd ..

# ── 7. Done! Print instructions ───────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║              ✅ Setup Complete!                       ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║                                                       ║"
echo "║  To start the project, open 3 terminals:             ║"
echo "║                                                       ║"
echo "║  Terminal 1 — Backend:                               ║"
echo "║    cd backend                                         ║"
echo "║    source venv/bin/activate                           ║"
echo "║    uvicorn app.main:app --reload --port 8000          ║"
echo "║    → http://localhost:8000/docs                       ║"
echo "║                                                       ║"
echo "║  Terminal 2 — Frontend:                              ║"
echo "║    cd frontend && npm run dev                         ║"
echo "║    → http://localhost:3000                            ║"
echo "║                                                       ║"
echo "║  Terminal 3 — Mobile:                                ║"
echo "║    cd mobile && expo start                            ║"
echo "║    → Scan QR with Expo Go app                         ║"
echo "║                                                       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
