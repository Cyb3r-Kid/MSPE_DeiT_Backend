"""Automated API endpoint tests for MSPE-DeiT Screening Application."""
import io
import json
import os
import tempfile
from pathlib import Path

os.environ["JWT_SECRET"] = "test-secret-at-least-thirty-two-characters-long"
_tmp = tempfile.TemporaryDirectory()
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_tmp.name, 'test.db').as_posix()}"
os.environ["UPLOAD_DIR"] = str(Path(_tmp.name, "uploads"))

from fastapi.testclient import TestClient
from PIL import Image

from main import app


def register_user(client, email="testuser@example.com"):
    response = client.post(
        "/api/auth/register",
        json={"name": "Dr. Dermatologist", "email": email, "password": "secure-screening-password"},
    )
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def create_sample_lesion_image() -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (224, 224), color=(180, 120, 100))
    # Draw dark atypical center
    for x in range(80, 144):
        for y in range(80, 144):
            img.putpixel((x, y), (50, 20, 20))
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_health_endpoint():
    """Verify health endpoint returns status 200 and healthy status."""
    with TestClient(app) as client:
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["system"] == "MSPE-DeiT Screening API"
        assert "models_initialized" in data


def test_multipart_screening_inference():
    """Verify multipart screening request with sample image and valid clinical metadata."""
    with TestClient(app) as client:
        headers = register_user(client, "screener@example.com")
        img_bytes = create_sample_lesion_image()

        clinical_meta = {
            "age": 52,
            "sex": "female",
            "anatomical_site": "upper extremity",
            "lesion_diameter_mm": 7.5,
            "evolution_history": True,
            "family_history": False,
            "itch_bleed": True,
            "fitzpatrick_skin_type": "II",
        }

        resp = client.post(
            "/api/screenings/analyze",
            headers=headers,
            files={"image": ("lesion.jpg", img_bytes, "image/jpeg")},
            data={"clinical": json.dumps(clinical_meta), "modality": "dermoscopy"},
        )
        assert resp.status_code == 200
        data = resp.json()

        assert "id" in data
        assert "risk_level" in data
        assert data["risk_level"] in ("Low Risk", "Moderate Risk", "High Risk")
        assert 0.0 <= data["ensemble_probability"] <= 1.0
        assert "model_probabilities" in data
        assert "mspe_deit" in data["model_probabilities"]
        assert "xgboost" in data["model_probabilities"]
        assert "ann" in data["model_probabilities"]
        assert data["modality_used"] == "dermoscopy"
        assert "recommendation" in data

        # Check PDF report generation returns valid byte stream with PDF header %PDF-
        db_id = data["database_id"]
        pdf_resp = client.get(f"/api/screenings/{db_id}/report", headers=headers)
        assert pdf_resp.status_code == 200
        assert pdf_resp.headers["content-type"] == "application/pdf"
        assert pdf_resp.content.startswith(b"%PDF-")


def test_screening_validation_errors():
    """Verify corrupted image or invalid clinical age/diameter get rejected."""
    with TestClient(app) as client:
        headers = register_user(client, "validator@example.com")

        # Corrupted non-image file
        bad_resp = client.post(
            "/api/screenings/analyze",
            headers=headers,
            files={"image": ("bad.txt", b"not-an-image-file", "image/jpeg")},
            data={"clinical": json.dumps({"age": 30}), "modality": "dermoscopy"},
        )
        assert bad_resp.status_code == 400

        # Invalid age
        img_bytes = create_sample_lesion_image()
        age_resp = client.post(
            "/api/screenings/analyze",
            headers=headers,
            files={"image": ("lesion.jpg", img_bytes, "image/jpeg")},
            data={"clinical": json.dumps({"age": 150}), "modality": "dermoscopy"},
        )
        assert age_resp.status_code == 422


def test_refresh_rotates_token():
    with TestClient(app) as client:
        response = client.post(
            "/api/auth/register",
            json={"name": "Rotate", "email": "rotate@example.com", "password": "long-secret-password"},
        )
        token = response.json()["refresh_token"]
        assert client.post("/api/v1/auth/refresh", json={"refresh_token": token}).status_code == 200
        assert client.post("/api/v1/auth/refresh", json={"refresh_token": token}).status_code == 401
