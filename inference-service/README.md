# MSPE-DeiT Standalone Inference Microservice

This microservice handles the compute-heavy multimodal AI inference pipeline (MSPE-DeiT Vision Transformer + Tabular ANN + XGBoost + Soft-Voting Fusion).

---

## 1. Why Separate the Inference Service?

Vercel Serverless Functions have a strict maximum package size limit:
- **Maximum uncompressed Lambda size**: `500 MB` (approximately `250 MB` zipped).
- **Heavy ML dependencies** (`torch`, `torchvision`, `cuda`, `timm`, `xgboost`, `scipy`) exceed **5.9 GB** when installed from standard wheels.

By separating lightweight API operations (auth, users, database, consent, audit logs, PDF report generation) from heavy AI inference:
1. The **FastAPI backend** on Vercel deploys in seconds and fits comfortably within **~45 MB**.
2. The **Inference Service** runs in an unconstrained container environment (Docker, GPU or CPU) on Render, Railway, Hugging Face Spaces, or Fly.io.
3. The Vercel backend communicates with the inference service over secure HTTPS using `INFERENCE_SERVICE_URL`.

---

## 2. Quick Deploy Options

### Option A: Render (Free / Starter Web Service)
1. Push this repository to GitHub.
2. In Render Dashboard, click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Set **Root Directory** to `inference-service`.
5. Select **Environment**: `Docker`.
6. Click **Deploy Web Service**.
7. Copy your assigned URL (e.g., `https://mspe-deit-inference.onrender.com`).
8. In your **Vercel Project Settings** -> **Environment Variables**, add:
   ```env
   INFERENCE_SERVICE_URL=https://mspe-deit-inference.onrender.com
   ```

### Option B: Railway
1. Click **New Project** -> **Deploy from GitHub repo**.
2. Under Settings, set Root Directory to `/inference-service`.
3. Railway automatically builds the `Dockerfile`.
4. Generate a public domain and set `INFERENCE_SERVICE_URL` in Vercel.

### Option C: Hugging Face Spaces (Free CPU / Low-cost GPU)
1. Create a new Space with SDK: **Docker**.
2. Upload the `inference-service` folder contents.
3. Use the public Space direct URL as `INFERENCE_SERVICE_URL`.

---

## 3. Local Development (No Remote Service Needed)

For local development or Windows/Linux laptop deployment, the main FastAPI backend automatically detects locally installed PyTorch packages and executes inference directly without requiring `INFERENCE_SERVICE_URL`.

To install full ML packages locally:
```bash
pip install -r backend/requirements-full.txt
```

---

## 4. API Specification

### `GET /health`
Returns worker health, device (`cpu` or `cuda`), and model loading status.

### `POST /infer`
Multipart request:
- `file`: Image file (`image/jpeg` or `image/png`)
- `clinical`: JSON string containing clinical attributes:
  ```json
  {
    "patient_age": 52,
    "sex": "female",
    "anatom_site_general": "upper extremity",
    "lesion_diameter_mm": 7.5,
    "personal_history": false,
    "family_history": false,
    "itching": true,
    "bleeding": false,
    "elevation": true,
    "evolution": true,
    "modality": "dermoscopy"
  }
  ```

Response:
```json
{
  "p_mspe": 0.724,
  "p_xgb": 0.651,
  "p_ann": 0.683,
  "ensemble_probability": 0.686,
  "risk_level": "High Risk",
  "recommendation": "Dermatology referral recommended for dermoscopic biopsy correlation and histopathological evaluation.",
  "model_probabilities": {
    "mspe_deit": 0.724,
    "xgboost": 0.651,
    "ann": 0.683
  },
  "model_version": "MSPE-DeiT-v1.0",
  "device": "cpu"
}
```
