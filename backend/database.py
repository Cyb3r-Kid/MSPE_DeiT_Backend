"""Database configuration and session management for MSPE-DeiT.
Wraps SQLAlchemy models and engine.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.db import (
    Base,
    engine,
    SessionLocal,
    get_db,
    User,
    Consent,
    Assessment,
    Prediction,
    RefreshToken,
    AuditLog,
    now,
    DATABASE_URL,
    DB_PATH,
)

__all__ = [
    "Base",
    "engine",
    "SessionLocal",
    "get_db",
    "User",
    "Consent",
    "Assessment",
    "Prediction",
    "RefreshToken",
    "AuditLog",
    "now",
    "DATABASE_URL",
    "DB_PATH",
]

