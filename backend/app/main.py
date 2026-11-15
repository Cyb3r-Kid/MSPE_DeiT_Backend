import hashlib
import io
import os
import secrets
from contextlib import asynccontextmanager
from datetime import timezone
from pathlib import Path

from argon2.exceptions import VerifyMismatchError
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PIL import Image, ImageStat, UnidentifiedImageError
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen.canvas import Canvas
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import Assessment, AuditLog, Base, Consent, Prediction, RefreshToken, User, engine, get_db, now, get_upload_dir
from .inference import artifact_dir, metadata, predict, status
from .schemas import AssessmentCreate, Clinical, ConsentRequest, Login, ProfileUpdate, Refresh, Register, TokenPair
from .security import access_token, current_user, hasher, new_refresh_token


@asynccontextmanager
async def lifespan(application: FastAPI):
    Base.metadata.create_all(engine)  # Alembic migration is provided for managed environments.
    upload_dir = get_upload_dir()
    upload_dir.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="MSPE-DeiT Research API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:8081").split(","), allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def audit(db: Session, user_id: int | None, action: str, outcome: str = "success"):
    db.add(AuditLog(user_id=user_id, action=action, outcome=outcome))
    db.commit()


def get_assessment(db: Session, assessment_id: int, user: User) -> Assessment:
    item = db.scalar(select(Assessment).where(Assessment.id == assessment_id, Assessment.user_id == user.id))
    if not item:
        raise HTTPException(404, "Assessment not found")
    return item


def assessment_out(item: Assessment):
    p = item.prediction
    return {"id": item.id, "modality": item.modality, "clinical_metadata": item.clinical_metadata, "status": item.status, "created_at": item.created_at, "completed_at": item.completed_at, "has_image": bool(item.image_reference), "prediction": None if p is None else {key: getattr(p, key) for key in ("model_version", "image_probability", "xgboost_probability", "ann_probability", "ensemble_probability", "threshold", "calibration_version")}}


def has_consent(db: Session, user_id: int, kind: str):
    return db.scalar(select(Consent).where(Consent.user_id == user_id, Consent.consent_type == kind, Consent.revoked_at.is_(None)).order_by(Consent.id.desc())) is not None


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}


@app.get("/api/v1/models/status")
def models_status():
    return status()


@app.get("/api/v1/models/metadata")
def models_metadata():
    return metadata()


@app.post("/api/v1/auth/register", response_model=TokenPair, status_code=201)
def register(body: Register, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "Email already registered")
    user = User(name=body.name.strip(), email=email, password_hash=hasher.hash(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    audit(db, user.id, "register")
    return TokenPair(access_token=access_token(user.id), refresh_token=new_refresh_token(db, user.id))


@app.post("/api/v1/auth/login", response_model=TokenPair)
def login(body: Login, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    try:
        valid = bool(user and hasher.verify(user.password_hash, body.password))
    except VerifyMismatchError:
        valid = False
    if not valid:
        raise HTTPException(401, "Invalid credentials")
    audit(db, user.id, "login")
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


@app.post("/api/v1/auth/logout")
def logout(body: Refresh, user: User = Depends(current_user), db: Session = Depends(get_db)):
    token = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hashlib.sha256(body.refresh_token.encode()).hexdigest(), RefreshToken.user_id == user.id))
    if token:
        token.revoked = True
        db.commit()
    return {"ok": True}


@app.get("/api/v1/auth/me")
@app.get("/api/v1/users/profile")
def profile(user: User = Depends(current_user)):
    return {"id": user.id, "name": user.name, "email": user.email, "created_at": user.created_at}


@app.patch("/api/v1/users/profile")
def update_profile(body: ProfileUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    user.name = body.name.strip()
    db.commit()
    return profile(user)


@app.get("/api/v1/users/privacy")
def privacy(user: User = Depends(current_user), db: Session = Depends(get_db)):
    records = db.scalars(select(Consent).where(Consent.user_id == user.id).order_by(Consent.id.desc())).all()
    return {"consents": [{"type": c.consent_type, "version": c.consent_version, "granted_at": c.granted_at, "revoked_at": c.revoked_at} for c in records], "retention": "Data remains until you delete an assessment or account."}


@app.post("/api/v1/users/consent")
def consent(body: ConsentRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    active = db.scalars(select(Consent).where(Consent.user_id == user.id, Consent.consent_type == body.consent_type, Consent.revoked_at.is_(None))).all()
    for record in active:
        record.revoked_at = now()
    if body.granted:
        db.add(Consent(user_id=user.id, consent_type=body.consent_type, consent_version=body.consent_version))
    db.commit()
    audit(db, user.id, "consent_change")
    return {"granted": body.granted}


@app.delete("/api/v1/users/account", status_code=204)
def delete_account(user: User = Depends(current_user), db: Session = Depends(get_db)):
    for item in user.assessments:
        if item.image_reference:
            Path(item.image_reference).unlink(missing_ok=True)
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).delete()
    db.query(AuditLog).filter(AuditLog.user_id == user.id).delete()
    db.delete(user)
    db.commit()


@app.post("/api/v1/assessments", status_code=201)
def create_assessment(body: AssessmentCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not has_consent(db, user.id, "research_assessment"):
        raise HTTPException(403, "Research assessment consent required")
    item = Assessment(user_id=user.id, modality=body.modality, clinical_metadata=body.clinical_metadata.model_dump(exclude_none=True))
    db.add(item)
    db.commit()
    db.refresh(item)
    audit(db, user.id, "assessment_create")
    return assessment_out(item)


@app.get("/api/v1/assessments")
def list_assessments(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [assessment_out(item) for item in db.scalars(select(Assessment).where(Assessment.user_id == user.id).order_by(Assessment.id.desc())).all()]


@app.get("/api/v1/assessments/{assessment_id}")
def assessment_detail(assessment_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return assessment_out(get_assessment(db, assessment_id, user))


@app.post("/api/v1/assessments/{assessment_id}/image")
async def upload_image(assessment_id: int, file: UploadFile = File(...), user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = get_assessment(db, assessment_id, user)
    if not has_consent(db, user.id, "image_storage"):
        raise HTTPException(403, "Image storage consent required")
    if file.content_type not in ("image/jpeg", "image/png"):
        raise HTTPException(415, "Upload a JPEG or PNG image")
    contents = await file.read(10 * 1024 * 1024 + 1)
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(413, "Image exceeds 10 MB")
    try:
        with Image.open(io.BytesIO(contents)) as image:
            image.verify()
        with Image.open(io.BytesIO(contents)) as image:
            if image.format not in ("JPEG", "PNG") or not (224 <= image.width <= 8000 and 224 <= image.height <= 8000) or image.width * image.height > 25_000_000:
                raise HTTPException(422, "Use a valid JPEG or PNG, at least 224 pixels on each side and at most 25 megapixels")
            expected = "JPEG" if file.content_type == "image/jpeg" else "PNG"
            if image.format != expected:
                raise HTTPException(415, "The file content does not match its declared image type")
            gray = image.convert("L").resize((128, 128))
            mean, deviation = ImageStat.Stat(gray).mean[0], ImageStat.Stat(gray).stddev[0]
            if mean < float(os.getenv("MIN_IMAGE_BRIGHTNESS", "15")):
                raise HTTPException(422, "Image is too dark; retake it with even lighting")
            if mean > float(os.getenv("MAX_IMAGE_BRIGHTNESS", "245")):
                raise HTTPException(422, "Image is overexposed; retake it without glare")
            if deviation < float(os.getenv("MIN_IMAGE_CONTRAST", "5")):
                raise HTTPException(422, "Image lacks visible detail; retake a focused, well-lit image")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(422, "Image is corrupted or unsupported")
    directory = get_upload_dir()
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{secrets.token_hex(24)}.{ 'jpg' if file.content_type == 'image/jpeg' else 'png'}"
    path.write_bytes(contents)
    if item.image_reference:
        Path(item.image_reference).unlink(missing_ok=True)
    item.image_reference = str(path)
    item.status = "uploaded"
    db.commit()
    audit(db, user.id, "image_upload")
    return {"ok": True, "assessment_id": item.id}


@app.post("/api/v1/assessments/{assessment_id}/analyze")
def analyze(assessment_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = get_assessment(db, assessment_id, user)
    if not item.image_reference:
        raise HTTPException(422, "Upload an image first")
    if item.prediction:
        return assessment_out(item)
    result = predict(item.image_reference, item.modality, item.clinical_metadata)
    db.add(Prediction(assessment_id=item.id, **result))
    item.status = "completed"
    item.completed_at = now()
    db.commit()
    db.refresh(item)
    audit(db, user.id, "analyze")
    return assessment_out(item)


@app.get("/api/v1/assessments/{assessment_id}/explanation")
def explanation(assessment_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = get_assessment(db, assessment_id, user)
    if not item.prediction or not item.image_reference or not status()["ready"]:
        return {"available": False, "reason": "A saved real prediction and compatible artifacts are required; no heatmap has been generated."}
    try:
        import sys
        sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
        from ml.explainability.explain import explain
        return explain(item.image_reference, item.modality, item.clinical_metadata, artifact_dir())
    except Exception:
        return {"available": False, "reason": "Attribution could not be computed with the installed artifacts."}


@app.get("/api/v1/assessments/{assessment_id}/report")
def report(assessment_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = get_assessment(db, assessment_id, user)
    out = io.BytesIO()
    pdf = Canvas(out, pagesize=A4)
    pdf.setTitle(f"MSPE-DeiT research assessment {item.id}")
    lines = ["MSPE-DeiT | Research assessment", f"Assessment ID: {item.id}", f"Date: {item.created_at.isoformat()}", f"Modality: {item.modality}", f"Status: {item.status}"]
    lines += [f"{key}: {value}" for key, value in item.clinical_metadata.items()]
    if item.prediction:
        p = item.prediction
        lines += [f"Model: {p.model_version}", f"Image probability: {p.image_probability:.4f}", f"XGBoost probability: {p.xgboost_probability:.4f}", f"ANN probability: {p.ann_probability:.4f}", f"Ensemble estimate: {p.ensemble_probability:.4f}"]
    else:
        lines.append("No prediction available. Models may be untrained or unavailable.")
    lines += ["Research use only. This is not a diagnosis or pathology report.", "A dermatologist's examination is needed for diagnosis."]
    for index, line in enumerate(lines):
        pdf.drawString(48, 790 - index * 25, line[:95])
    pdf.save()
    out.seek(0)
    return StreamingResponse(out, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="assessment-{item.id}.pdf"'})


@app.delete("/api/v1/assessments/{assessment_id}", status_code=204)
def delete_assessment(assessment_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = get_assessment(db, assessment_id, user)
    if item.image_reference:
        Path(item.image_reference).unlink(missing_ok=True)
    db.delete(item)
    db.commit()
    audit(db, user.id, "assessment_delete")
