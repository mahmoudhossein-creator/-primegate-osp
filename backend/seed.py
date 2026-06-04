"""
Run this once to create the first admin user:
  cd backend
  venv\Scripts\activate
  python seed.py
"""
import sys
sys.path.insert(0, ".")

from app.core.database import SessionLocal, engine, Base
from app.models.user import User, UserRole, District
from app.core.security import hash_password
from datetime import datetime

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Create default district
district = db.query(District).filter_by(name="Riyadh").first()
if not district:
    district = District(name="Riyadh", region="Central", created_at=datetime.utcnow())
    db.add(district)
    db.flush()
    print("✓ District 'Riyadh' created")

# Create admin user
existing = db.query(User).filter_by(email="admin@primegate.com").first()
if not existing:
    user = User(
        name="Admin",
        email="admin@primegate.com",
        password_hash=hash_password("admin123"),
        role=UserRole.MANAGEMENT,
        district_id=district.id,
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db.add(user)
    print("✓ Admin user created")
else:
    print("✓ Admin user already exists")

# Create district manager
dm = db.query(User).filter_by(email="dm@primegate.com").first()
if not dm:
    dm = User(
        name="District Manager",
        email="dm@primegate.com",
        password_hash=hash_password("dm123456"),
        role=UserRole.DISTRICT_MANAGER,
        district_id=district.id,
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db.add(dm)
    print("✓ District Manager created")

db.commit()
db.close()

print("\n" + "="*40)
print("  Login Credentials:")
print("="*40)
print("  Management:")
print("    Email:    admin@primegate.com")
print("    Password: admin123")
print("")
print("  District Manager:")
print("    Email:    dm@primegate.com")
print("    Password: dm123456")
print("="*40)
