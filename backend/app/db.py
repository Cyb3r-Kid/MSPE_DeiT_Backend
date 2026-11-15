import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

try:
    from dotenv import load_dotenv
    _env_file = Path(__file__).resolve().parent.parent / ".env"
    if _env_file.is_file():
        load_dotenv(_env_file)
except ImportError:
    pass

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker


def now():
    return datetime.now(timezone.utc)


def resolve_database_url() -> tuple[str, Path | None]:
    """Resolves and validates the database URL, ensuring parent directories exist.
    Guarantees stable absolute path for SQLite and handles Windows folder protection.
    """
    raw_url = os.getenv("DATABASE_URL", "sqlite:///./mspe.db")

    if not raw_url.startswith("sqlite"):
        return raw_url, None

    backend_dir = Path(__file__).resolve().parent.parent

    if raw_url.startswith("sqlite:///"):
        path_str = raw_url[len("sqlite:///"):]
    elif raw_url.startswith("sqlite://"):
        path_str = raw_url[len("sqlite://"):]
    else:
        path_str = "./mspe.db"

    if path_str in ("", ":memory:"):
        return "sqlite:///:memory:", None

    db_path = Path(path_str)
    if not db_path.is_absolute():
        db_path = (backend_dir / db_path).resolve()
    else:
        db_path = db_path.resolve()

    # Automatically create parent directory and verify writability
    try:
        db_path.parent.mkdir(parents=True, exist_ok=True)
        probe = db_path.parent / f".db_probe_{os.getpid()}"
        with open(probe, "a") as f:
            f.write("")
        probe.unlink(missing_ok=True)
        final_path = db_path
    except (OSError, PermissionError):
        # Protected folder (such as Windows Controlled Folder Access on user folders)
        fallback_dir = Path(os.getenv("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))) / "MSPE_DeiT"
        fallback_dir.mkdir(parents=True, exist_ok=True)
        final_path = (fallback_dir / db_path.name).resolve()

    # Preserve any existing database file
    orig_path = (backend_dir / db_path.name).resolve()
    if orig_path.is_file() and orig_path.stat().st_size > 0 and not final_path.is_file():
        try:
            shutil.copy2(orig_path, final_path)
        except (OSError, PermissionError):
            pass

    # Ensure parent directory exists
    final_path.parent.mkdir(parents=True, exist_ok=True)

    final_url = f"sqlite:///{final_path.as_posix()}"
    return final_url, final_path


def get_upload_dir() -> Path:
    """Resolves and validates the upload directory, ensuring it is writable on Windows."""
    raw = os.getenv("UPLOAD_DIR", "./private_uploads")
    backend_dir = Path(__file__).resolve().parent.parent
    target = Path(raw)
    if not target.is_absolute():
        target = (backend_dir / target).resolve()
    else:
        target = target.resolve()
    try:
        target.mkdir(parents=True, exist_ok=True)
        probe = target / f".upload_probe_{os.getpid()}"
        with open(probe, "a") as f:
            f.write("")
        probe.unlink(missing_ok=True)
        return target
    except (OSError, PermissionError):
        fallback = Path(os.getenv("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))) / "MSPE_DeiT" / "uploads"
        fallback.mkdir(parents=True, exist_ok=True)
        return fallback.resolve()


DATABASE_URL, DB_PATH = resolve_database_url()
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    assessments = relationship("Assessment", cascade="all, delete-orphan")
    consents = relationship("Consent", cascade="all, delete-orphan")


class Consent(Base):
    __tablename__ = "consents"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    consent_type: Mapped[str] = mapped_column(String(40))
    consent_version: Mapped[str] = mapped_column(String(20), default="1")
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Assessment(Base):
    __tablename__ = "assessments"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    modality: Mapped[str] = mapped_column(String(30))
    clinical_metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    image_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    prediction = relationship("Prediction", uselist=False, cascade="all, delete-orphan")


class Prediction(Base):
    __tablename__ = "predictions"
    id: Mapped[int] = mapped_column(primary_key=True)
    assessment_id: Mapped[int] = mapped_column(ForeignKey("assessments.id"), unique=True)
    model_version: Mapped[str] = mapped_column(String(100))
    image_probability: Mapped[float] = mapped_column(Float)
    xgboost_probability: Mapped[float] = mapped_column(Float)
    ann_probability: Mapped[float] = mapped_column(Float)
    ensemble_probability: Mapped[float] = mapped_column(Float)
    threshold: Mapped[float] = mapped_column(Float)
    calibration_version: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(80))
    outcome: Mapped[str] = mapped_column(String(30))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


def get_db():
    with SessionLocal() as db:
        yield db
