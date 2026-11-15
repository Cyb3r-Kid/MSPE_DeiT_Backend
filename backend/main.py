"""MSPE-DeiT Multimodal Skin Cancer Screening Backend.
FastAPI Application serving multimodal inference, auth, assessments, and reports.
"""
from contextlib import asynccontextmanager
import hashlib
import io
import json
import os
from pathlib import Path
import secrets
import sys
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from argon2.exceptions import VerifyMismatchError
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status as http_status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from PIL import Image, ImageStat, UnidentifiedImageError
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

# Ensure local backend imports resolve
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
root_dir = backend_dir.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

try:
    from dotenv import load_dotenv
    _env_file = backend_dir / ".env"
    if not _env_file.is_file():
        _env_file = root_dir / ".env"
    if _env_file.is_file():
        load_dotenv(_env_file)
except ImportError:
    pass

from app.db import (
    Assessment,
    AuditLog,
    Base,
    Consent,
    Prediction,
    RefreshToken,
    User,
    engine,
    get_db,
    now,
    get_upload_dir,
)
from app.schemas import (
    AssessmentCreate,
    Clinical,
    ConsentRequest,
    Login,
    ProfileUpdate,
    Refresh,
    Register,
    TokenPair,
)
from app.security import (
    access_token,
    bearer,
    current_user,
    hasher,
    new_refresh_token,
)
from services.pdf_report import generate_pdf_report
from services.inference_service import inference_service
from models.ensemble import classify_risk, ensemble_assessment, soft_vote


def init_models():
    """Initializes models lazily if local ML packages exist, or verifies remote service."""
    if inference_service.has_remote_service:
        return True
    return inference_service.init_local_models()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(engine)
    except Exception as e:
        print(f"[Startup] DB create_all warning: {e}")
    try:
        upload_dir = get_upload_dir()
        upload_dir.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        print(f"[Startup] Upload dir warning: {e}")
    inference_service.init_local_models()
    yield


app = FastAPI(
    title="MSPE-DeiT Multimodal Skin Cancer Screening API",
    description="Multimodal Vision Transformer & Tabular Clinical Ensemble based on IEEE Access research",
    version="1.0.0",
    lifespan=lifespan,
)

# Export handler for serverless compatibility across all Vercel runtime versions
handler = app

# CORS configuration - Allow all LAN devices and development ports
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if "*" not in origins else ["*"],
    allow_origin_regex=r"^https?://.*" if "*" in origins else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health Endpoint ────────────────────────────────────────────────────────────
@app.get("/")
@app.get("/health")
@app.get("/api/health")
@app.get("/api/v1/health")
def health():
    backend_mode = (
        "remote_service" if inference_service.has_remote_service
        else "local_ml" if inference_service.is_local_ml_available
        else "serverless_lightweight"
    )
    is_ready = inference_service.is_ready
    return {
        "status": "healthy",
        "system": "MSPE-DeiT Screening API",
        "models_initialized": is_ready,
        "inference_backend": backend_mode,
        "mode": "production_ready" if is_ready else "serverless_lightweight",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/v1/models/status")
def models_status():
    backend_mode = (
        "remote_service" if inference_service.has_remote_service
        else "local_ml" if inference_service.is_local_ml_available
        else "serverless_lightweight"
    )
    return {
        "ready": inference_service.is_ready,
        "mode": backend_mode,
        "inference_backend": backend_mode,
        "remote_service_url": os.getenv("INFERENCE_SERVICE_URL") or None,
        "supported_modalities": ["dermoscopy", "dermoscopic", "tbp_3d", "3d_tbp"],
    }


# ── Auth Endpoints ─────────────────────────────────────────────────────────────
@app.post("/api/auth/register", response_model=TokenPair, status_code=http_status.HTTP_201_CREATED)
@app.post("/api/v1/auth/register", response_model=TokenPair, status_code=http_status.HTTP_201_CREATED)
def register(body: Register, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(name=body.name.strip(), email=email, password_hash=hasher.hash(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    db.add(AuditLog(user_id=user.id, action="register", outcome="success"))
    db.commit()
    return TokenPair(access_token=access_token(user.id), refresh_token=new_refresh_token(db, user.id))


@app.post("/api/auth/login", response_model=TokenPair)
@app.post("/api/v1/auth/login", response_model=TokenPair)
def login(body: Login, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    valid = False
    if user:
        try:
            valid = hasher.verify(user.password_hash, body.password)
        except VerifyMismatchError:
            valid = False
    if not valid:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    db.add(AuditLog(user_id=user.id, action="login", outcome="success"))
    db.commit()
    return TokenPair(access_token=access_token(user.id), refresh_token=new_refresh_token(db, user.id))


@app.post("/api/v1/auth/refresh", response_model=TokenPair)
def refresh(body: Refresh, db: Session = Depends(get_db)):
    hashed = hashlib.sha256(body.refresh_token.encode()).hexdigest()
    token = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hashed, RefreshToken.revoked.is_(False)))
    if not token or token.expires_at.replace(tzinfo=timezone.utc) <= now() or not db.get(User, token.user_id):
        raise HTTPException(401, "Invalid refresh token")
    token.revoked = True
    db.commit()
    return TokenPair(access_token=access_token(token.user_id), refresh_token=new_refresh_token(db, token.user_id))


@app.get("/api/v1/auth/me")
@app.get("/api/v1/users/profile")
def profile(user: User = Depends(current_user)):
    return {"id": user.id, "name": user.name, "email": user.email, "created_at": user.created_at}


# ── Multipart Screening Inference Endpoint ────────────────────────────────────
@app.post("/api/screenings/analyze")
async def analyze_screening(
    image: UploadFile = File(...),
    clinical: str = Form("{}"),
    modality: str = Form("dermoscopy"),
    user: Optional[User] = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Multipart screening request accepting image file and clinical JSON string."""
    # 1. Validate image format
    if image.content_type not in ("image/jpeg", "image/png", "image/jpg"):
        raise HTTPException(400, "Unsupported file format. Please upload JPEG or PNG image.")

    image_bytes = await image.read()
    if len(image_bytes) < 100:
        raise HTTPException(400, "Uploaded image is empty or corrupted.")
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(413, "Image file exceeds 10MB limit.")

    try:
        with Image.open(io.BytesIO(image_bytes)) as pil_img:
            pil_img.verify()
        with Image.open(io.BytesIO(image_bytes)) as pil_img:
            pil_img = pil_img.convert("RGB")
    except Exception:
        raise HTTPException(400, "Corrupted image file could not be parsed.")

    # 2. Parse clinical JSON
    try:
        clinical_data = json.loads(clinical) if isinstance(clinical, str) else clinical
    except Exception:
        clinical_data = {}

    # Validate age and diameter
    age = clinical_data.get("age")
    if age is not None:
        try:
            age = int(age)
            if not (1 <= age <= 120):
                raise HTTPException(422, "Patient age must be between 1 and 120 years.")
        except ValueError:
            raise HTTPException(422, "Patient age must be an integer.")

    diameter = clinical_data.get("lesion_diameter_mm") or clinical_data.get("diameter_mm")
    if diameter is not None:
        try:
            diameter = float(diameter)
            if diameter <= 0:
                raise HTTPException(422, "Lesion diameter must be a positive number.")
        except ValueError:
            raise HTTPException(422, "Lesion diameter must be a valid number.")

    # 3. Execute multimodal inference via inference service (Remote worker or Local models)
    infer_res = await inference_service.run_inference(
        image_bytes=image_bytes,
        modality=modality,
        clinical_data=clinical_data,
        filename=image.filename or "lesion.jpg",
        content_type=image.content_type or "image/jpeg",
    )
    p_mspe = infer_res["p_mspe"]
    p_xgb = infer_res["p_xgb"]
    p_ann = infer_res["p_ann"]
    p_ens = infer_res["ensemble_probability"]
    risk_level = infer_res["risk_level"]
    recommendation = infer_res["recommendation"]

    # 6. Save image to disk and record in DB
    upload_dir = get_upload_dir()
    upload_dir.mkdir(parents=True, exist_ok=True)
    ext = "png" if image.content_type == "image/png" else "jpg"
    img_filename = f"{secrets.token_hex(16)}.{ext}"
    img_path = upload_dir / img_filename
    img_path.write_bytes(image_bytes)

    screening_id = str(uuid.uuid4())
    user_id = user.id if user else None

    # Persist in Assessment table
    db_assessment = Assessment(
        user_id=user_id or 1,
        modality=modality,
        clinical_metadata=clinical_data,
        image_reference=str(img_path),
        status="completed",
        completed_at=now(),
    )
    db.add(db_assessment)
    db.commit()
    db.refresh(db_assessment)

    # Persist Prediction
    db_pred = Prediction(
        assessment_id=db_assessment.id,
        model_version=infer_res.get("model_version", "MSPE-DeiT-v1.0"),
        image_probability=p_mspe,
        xgboost_probability=p_xgb,
        ann_probability=p_ann,
        ensemble_probability=p_ens,
        threshold=0.50,
        calibration_version="isotonic-v1",
    )
    db.add(db_pred)
    db.commit()

    return {
        "id": screening_id,
        "database_id": db_assessment.id,
        "risk_level": risk_level,
        "ensemble_probability": p_ens,
        "model_probabilities": {
            "mspe_deit": p_mspe,
            "xgboost": p_xgb,
            "ann": p_ann,
        },
        "modality_used": modality,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "recommendation": recommendation,
    }


# ── Assessment List & Report Endpoints ─────────────────────────────────────────
@app.get("/api/screenings")
@app.get("/api/v1/assessments")
def list_screenings(user: User = Depends(current_user), db: Session = Depends(get_db)):
    items = db.scalars(select(Assessment).where(Assessment.user_id == user.id).order_by(Assessment.id.desc())).all()
    out = []
    for item in items:
        p = item.prediction
        out.append({
            "id": item.id,
            "modality": item.modality,
            "clinical_metadata": item.clinical_metadata,
            "status": item.status,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "completed_at": item.completed_at.isoformat() if item.completed_at else None,
            "has_image": bool(item.image_reference),
            "prediction": None if not p else {
                "model_version": p.model_version,
                "image_probability": p.image_probability,
                "xgboost_probability": p.xgboost_probability,
                "ann_probability": p.ann_probability,
                "ensemble_probability": p.ensemble_probability,
                "threshold": p.threshold,
                "calibration_version": p.calibration_version,
            },
        })
    return out


@app.get("/api/screenings/{assessment_id}/report")
@app.get("/api/v1/assessments/{assessment_id}/report")
def get_pdf_report(assessment_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = db.scalar(select(Assessment).where(Assessment.id == assessment_id, Assessment.user_id == user.id))
    if not item:
        raise HTTPException(404, "Screening assessment not found")

    p = db.scalar(select(Prediction).where(Prediction.assessment_id == item.id).order_by(Prediction.id.desc())) or item.prediction
    pred_dict = None
    if p:
        risk_lvl, rec = classify_risk(p.ensemble_probability)
        pred_dict = {
            "ensemble_probability": p.ensemble_probability,
            "risk_level": risk_lvl,
            "recommendation": rec,
            "model_probabilities": {
                "mspe_deit": p.image_probability,
                "xgboost": p.xgboost_probability,
                "ann": p.ann_probability,
            },
        }

    pdf_bytes = generate_pdf_report(
        assessment_id=item.id,
        modality=item.modality,
        clinical_metadata=item.clinical_metadata or {},
        prediction=pred_dict,
        image_path=item.image_reference,
        user_name=user.name,
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="screening-report-{assessment_id}.pdf"'},
    )


# ── Preserved Mobile-Compatible Endpoints ─────────────────────────────────────
def has_consent(db: Session, user_id: int, consent_type: str) -> bool:
    c = db.scalar(
        select(Consent)
        .where(Consent.user_id == user_id, Consent.consent_type == consent_type)
        .order_by(Consent.id.desc())
    )
    return bool(c and c.revoked_at is None)


@app.post("/api/v1/assessments", status_code=201)
def create_assessment_v1(body: AssessmentCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not has_consent(db, user.id, "research_assessment"):
        raise HTTPException(403, "Research assessment consent required")
    item = Assessment(user_id=user.id, modality=body.modality, clinical_metadata=body.clinical_metadata.model_dump(exclude_none=True))
    db.add(item)
    db.commit()
    db.refresh(item)
    db.add(AuditLog(user_id=user.id, action="assessment_create", outcome="success"))
    db.commit()
    return {
        "id": item.id,
        "modality": item.modality,
        "clinical_metadata": item.clinical_metadata,
        "status": item.status,
        "created_at": item.created_at,
        "completed_at": item.completed_at,
        "has_image": False,
        "prediction": None,
    }


@app.get("/api/v1/assessments/{assessment_id}")
def get_assessment_v1(assessment_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = db.scalar(select(Assessment).where(Assessment.id == assessment_id, Assessment.user_id == user.id))
    if not item:
        raise HTTPException(404, "Assessment not found")
    p = db.scalar(select(Prediction).where(Prediction.assessment_id == item.id).order_by(Prediction.id.desc())) or item.prediction
    return {
        "id": item.id,
        "modality": item.modality,
        "clinical_metadata": item.clinical_metadata,
        "status": item.status,
        "created_at": item.created_at,
        "completed_at": item.completed_at,
        "has_image": bool(item.image_reference),
        "prediction": None if not p else {
            "model_version": p.model_version,
            "image_probability": p.image_probability,
            "xgboost_probability": p.xgboost_probability,
            "ann_probability": p.ann_probability,
            "ensemble_probability": p.ensemble_probability,
            "threshold": p.threshold,
            "calibration_version": p.calibration_version,
        },
    }


@app.post("/api/v1/assessments/{assessment_id}/image")
async def upload_image_v1(assessment_id: int, file: UploadFile = File(...), user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = db.scalar(select(Assessment).where(Assessment.id == assessment_id, Assessment.user_id == user.id))
    if not item:
        raise HTTPException(404, "Assessment not found")
    if not has_consent(db, user.id, "image_storage"):
        raise HTTPException(403, "Image storage consent required")
    if file.content_type not in ("image/jpeg", "image/png", "image/jpg"):
        raise HTTPException(415, "Upload a JPEG or PNG image")
    contents = await file.read(10 * 1024 * 1024 + 1)
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(413, "Image exceeds 10 MB")
    try:
        with Image.open(io.BytesIO(contents)) as pil_img:
            pil_img.verify()
        with Image.open(io.BytesIO(contents)) as pil_img:
            if pil_img.format not in ("JPEG", "PNG") or not (224 <= pil_img.width <= 8000 and 224 <= pil_img.height <= 8000) or pil_img.width * pil_img.height > 25_000_000:
                raise HTTPException(422, "Use a valid JPEG or PNG, at least 224 pixels on each side and at most 25 megapixels")
            expected = "JPEG" if file.content_type in ("image/jpeg", "image/jpg") else "PNG"
            if pil_img.format != expected:
                raise HTTPException(415, "The file content does not match its declared image type")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(422, "Image is corrupted or unsupported")

    upload_dir = get_upload_dir()
    upload_dir.mkdir(parents=True, exist_ok=True)
    ext = "jpg" if file.content_type in ("image/jpeg", "image/jpg") else "png"
    path = upload_dir / f"{secrets.token_hex(24)}.{ext}"
    path.write_bytes(contents)
    if item.image_reference:
        Path(item.image_reference).unlink(missing_ok=True)
    item.image_reference = str(path)
    item.status = "uploaded"
    db.commit()
    db.add(AuditLog(user_id=user.id, action="image_upload", outcome="success"))
    db.commit()
    return {"ok": True, "assessment_id": item.id}


@app.post("/api/v1/assessments/{assessment_id}/analyze")
async def analyze_v1(assessment_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = db.scalar(select(Assessment).where(Assessment.id == assessment_id, Assessment.user_id == user.id))
    if not item or not item.image_reference:
        raise HTTPException(422, "Upload an image first")
    if item.prediction:
        return get_assessment_v1(assessment_id, user, db)

    image_path = Path(item.image_reference)
    if not image_path.is_file():
        raise HTTPException(404, "Image file not found on server")

    image_bytes = image_path.read_bytes()
    ext = image_path.suffix.lstrip(".").lower()
    content_type = "image/png" if ext == "png" else "image/jpeg"

    infer_res = await inference_service.run_inference(
        image_bytes=image_bytes,
        modality=item.modality or "dermoscopy",
        clinical_data=item.clinical_metadata or {},
        filename=image_path.name,
        content_type=content_type,
    )

    pred = Prediction(
        assessment_id=item.id,
        model_version=infer_res.get("model_version", "MSPE-DeiT-v1.0"),
        image_probability=infer_res["p_mspe"],
        xgboost_probability=infer_res["p_xgb"],
        ann_probability=infer_res["p_ann"],
        ensemble_probability=infer_res["ensemble_probability"],
        threshold=0.50,
        calibration_version="isotonic-v1",
    )
    db.add(pred)
    item.status = "completed"
    item.completed_at = now()
    db.commit()
    db.add(AuditLog(user_id=user.id, action="assessment_analyze", outcome="success"))
    db.commit()
    return get_assessment_v1(assessment_id, user, db)


@app.get("/api/v1/users/privacy")
def get_privacy_v1(user: User = Depends(current_user), db: Session = Depends(get_db)):
    records = db.scalars(select(Consent).where(Consent.user_id == user.id).order_by(Consent.id.desc())).all()
    return {
        "consents": [
            {
                "type": c.consent_type,
                "version": c.consent_version,
                "granted_at": c.granted_at.isoformat() if c.granted_at else "",
                "revoked_at": c.revoked_at.isoformat() if c.revoked_at else None,
            }
            for c in records
        ],
        "retention": "Data remains until you delete an assessment or account.",
    }


@app.post("/api/v1/users/consent")
def set_consent_v1(body: ConsentRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    active = db.scalars(select(Consent).where(Consent.user_id == user.id, Consent.consent_type == body.consent_type, Consent.revoked_at.is_(None))).all()
    for record in active:
        record.revoked_at = now()
    if body.granted:
        db.add(Consent(user_id=user.id, consent_type=body.consent_type, consent_version=body.consent_version))
    db.commit()
    db.add(AuditLog(user_id=user.id, action="consent_change", outcome="success"))
    db.commit()
    return {"granted": body.granted}


@app.delete("/api/v1/users/account", status_code=204)
def delete_account_v1(user: User = Depends(current_user), db: Session = Depends(get_db)):
    for item in user.assessments:
        if item.image_reference:
            Path(item.image_reference).unlink(missing_ok=True)
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).delete()
    db.query(AuditLog).filter(AuditLog.user_id == user.id).delete()
    db.delete(user)
    db.commit()


@app.delete("/api/v1/assessments/{assessment_id}", status_code=204)
def delete_assessment_v1(assessment_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = db.scalar(select(Assessment).where(Assessment.id == assessment_id, Assessment.user_id == user.id))
    if item:
        if item.image_reference:
            Path(item.image_reference).unlink(missing_ok=True)
        db.delete(item)
        db.commit()


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run("main:app", host=host, port=port, reload=True)

