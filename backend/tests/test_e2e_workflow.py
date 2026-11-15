"""Full 20-step End-to-End Integration and Delivery Verification Suite.
Validates the entire clinical screening workflow from registration to PDF delivery.
"""
import io
import os
import sys
import tempfile
from pathlib import Path
from PIL import Image, ImageDraw

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
repo_root = backend_dir.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

os.environ["JWT_SECRET"] = "clinical-screening-jwt-secret-at-least-32-chars-long"

from fastapi.testclient import TestClient
from main import app, init_models
from app.db import Base, engine, get_db, Assessment, Prediction, User, Consent

client = TestClient(app)


def make_test_lesion_image() -> bytes:
    """Creates a 256x256 RGB JPEG image with realistic contrast for dermoscopy validation."""
    buf = io.BytesIO()
    img = Image.new("RGB", (256, 256), color=(215, 190, 175))
    draw = ImageDraw.Draw(img)
    # Atypical pigmented lesion structure with gradient
    draw.ellipse([60, 60, 196, 196], fill=(70, 35, 25))
    draw.ellipse([85, 85, 160, 160], fill=(30, 15, 10))
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()


def test_full_20_step_e2e_clinical_workflow():
    """Executes the complete 20-step clinical screening lifecycle."""
    Base.metadata.create_all(engine)
    init_models()

    # Step 1: Health Check
    health_resp = client.get("/api/v1/health")
    assert health_resp.status_code == 200, f"Health check failed: {health_resp.text}"
    health_data = health_resp.json()
    assert health_data["status"] == "healthy"

    # Step 2: Model Status Check
    model_status_resp = client.get("/api/v1/models/status")
    assert model_status_resp.status_code == 200
    model_status = model_status_resp.json()
    assert "ready" in model_status
    assert "supported_modalities" in model_status

    # Step 3: Register a new clinician account
    user_email = f"oncologist_{os.urandom(4).hex()}@research.org"
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Dr. Sarah Lin, MD",
            "email": user_email,
            "password": "ComprehensiveClinicalPass123!",
        },
    )
    assert reg_resp.status_code == 201, f"Registration failed: {reg_resp.text}"
    tokens = reg_resp.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # Step 4: Login to verify credential verification
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": user_email, "password": "ComprehensiveClinicalPass123!"},
    )
    assert login_resp.status_code == 200
    login_tokens = login_resp.json()
    assert "access_token" in login_tokens

    # Step 5: Profile retrieval
    profile_resp = client.get("/api/v1/users/profile", headers=headers)
    assert profile_resp.status_code == 200
    profile_data = profile_resp.json()
    assert profile_data["email"] == user_email
    assert profile_data["name"] == "Dr. Sarah Lin, MD"

    # Step 6: Initial Privacy State (Consent should NOT be auto-granted)
    privacy_resp = client.get("/api/v1/users/privacy", headers=headers)
    assert privacy_resp.status_code == 200
    privacy_data = privacy_resp.json()
    # No active consents should exist yet
    assert len(privacy_data["consents"]) == 0

    # Step 7: Attempt assessment creation without consent (Must be rejected with 403)
    unauthorized_draft = client.post(
        "/api/v1/assessments",
        json={
            "modality": "dermoscopic",
            "clinical_metadata": {"age": 48, "sex": "female", "anatomical_location": "left forearm"},
        },
        headers=headers,
    )
    assert unauthorized_draft.status_code == 403
    assert "consent required" in unauthorized_draft.text.lower()

    # Step 8: Grant Research Assessment Consent
    grant_res_consent = client.post(
        "/api/v1/users/consent",
        json={"consent_type": "research_assessment", "consent_version": "1", "granted": True},
        headers=headers,
    )
    assert grant_res_consent.status_code == 200
    assert grant_res_consent.json()["granted"] is True

    # Step 9: Create assessment record with validated modality
    create_resp = client.post(
        "/api/v1/assessments",
        json={
            "modality": "dermoscopic",
            "clinical_metadata": {
                "age": 48,
                "sex": "female",
                "anatomical_location": "left forearm",
            },
        },
        headers=headers,
    )
    assert create_resp.status_code == 201
    assessment_id = create_resp.json()["id"]
    assert create_resp.json()["status"] == "draft"

    # Step 10: Attempt image upload without image_storage consent (Must be rejected with 403)
    img_bytes = make_test_lesion_image()
    no_consent_upload = client.post(
        f"/api/v1/assessments/{assessment_id}/image",
        files={"file": ("lesion.jpg", img_bytes, "image/jpeg")},
        headers=headers,
    )
    assert no_consent_upload.status_code == 403
    assert "image storage consent required" in no_consent_upload.text.lower()

    # Step 11: Grant Image Storage Consent
    grant_img_consent = client.post(
        "/api/v1/users/consent",
        json={"consent_type": "image_storage", "consent_version": "1", "granted": True},
        headers=headers,
    )
    assert grant_img_consent.status_code == 200
    assert grant_img_consent.json()["granted"] is True

    # Step 12: Upload lesion image with multipart boundary (UploadFile)
    upload_resp = client.post(
        f"/api/v1/assessments/{assessment_id}/image",
        files={"file": ("lesion.jpg", img_bytes, "image/jpeg")},
        headers=headers,
    )
    assert upload_resp.status_code == 200, f"Upload failed: {upload_resp.text}"
    assert upload_resp.json()["ok"] is True

    # Step 13: Verify assessment status is now 'uploaded'
    detail_resp = client.get(f"/api/v1/assessments/{assessment_id}", headers=headers)
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()
    assert detail_data["status"] == "uploaded"
    assert detail_data["has_image"] is True
    assert detail_data["clinical_metadata"]["age"] == 48

    # Step 14: Execute Multimodal AI Inference
    analyze_resp = client.post(f"/api/v1/assessments/{assessment_id}/analyze", headers=headers)
    assert analyze_resp.status_code == 200, f"Inference failed: {analyze_resp.text}"
    analyzed_data = analyze_resp.json()
    assert analyzed_data["status"] == "completed"
    pred = analyzed_data["prediction"]
    assert pred is not None

    # Step 15: Validate Calibrated Model Probabilities
    assert 0.0 <= pred["ensemble_probability"] <= 1.0
    assert 0.0 <= pred["image_probability"] <= 1.0
    assert 0.0 <= pred["xgboost_probability"] <= 1.0
    assert 0.0 <= pred["ann_probability"] <= 1.0
    assert pred["model_version"] == "MSPE-DeiT-v1.0"
    assert pred["calibration_version"] == "isotonic-v1"

    # Step 16: Retrieve Authenticated PDF Clinical Report
    pdf_resp = client.get(f"/api/v1/assessments/{assessment_id}/report", headers=headers)
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert pdf_resp.content.startswith(b"%PDF-")
    assert len(pdf_resp.content) > 1000

    # Step 17: Verify Assessment History Registry
    history_resp = client.get("/api/v1/assessments", headers=headers)
    assert history_resp.status_code == 200
    history_list = history_resp.json()
    assert len(history_list) >= 1
    matched = next((item for item in history_list if item["id"] == assessment_id), None)
    assert matched is not None
    assert matched["status"] == "completed"

    # Step 18: Rotate Refresh Token
    refresh_resp = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_resp.status_code == 200
    new_tokens = refresh_resp.json()
    assert "access_token" in new_tokens
    assert "refresh_token" in new_tokens
    assert new_tokens["refresh_token"] != refresh_token

    # Step 19: Revoke Consent and verify submission is immediately blocked
    revoke_resp = client.post(
        "/api/v1/users/consent",
        json={"consent_type": "research_assessment", "consent_version": "1", "granted": False},
        headers={"Authorization": f"Bearer {new_tokens['access_token']}"},
    )
    assert revoke_resp.status_code == 200
    blocked_draft = client.post(
        "/api/v1/assessments",
        json={"modality": "dermoscopic", "clinical_metadata": {}},
        headers={"Authorization": f"Bearer {new_tokens['access_token']}"},
    )
    assert blocked_draft.status_code == 403

    # Step 20: Clean up assessment record
    del_resp = client.delete(
        f"/api/v1/assessments/{assessment_id}",
        headers={"Authorization": f"Bearer {new_tokens['access_token']}"},
    )
    assert del_resp.status_code == 204
