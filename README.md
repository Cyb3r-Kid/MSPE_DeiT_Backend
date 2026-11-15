# MSPE-DeiT: Multimodal Vision Transformer Skin Cancer Screening Platform

[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-1.0.0-009688.svg)](https://fastapi.tiangolo.com/)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB.svg)](https://reactnative.dev/)
[![Expo SDK 57](https://img.shields.io/badge/Expo-SDK%2057-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6.svg)](https://www.typescriptlang.org/)
[![Pytest](https://img.shields.io/badge/Pytest-12%20Passed-brightgreen.svg)]()

A complete, production-ready, runnable end-to-end multimodal skin cancer screening system based on the IEEE Access research paper:  
**"MSPE-DeiT: A Vision Transformer-Based Multimodal Framework for Skin Cancer Diagnosis"**.

---

## 🔬 System Architecture & Multimodal Fusion Pipeline

The application combines dermatological / 3D-TBP imagery with structured patient clinical metadata across 4 interconnected analytical branches:

```
[Lesion Imagery (224x224)] ──► MSPE-DeiT (DeiT-Tiny Backbone) ──► P(Image)
                                     ▲ (Dermoscopy vs 3D-TBP)           │
                                                                        ▼
[Clinical Metadata]       ──► Tabular XGBoost Trees           ──► P(XGB) ──► [Calibrated Soft-Voting] ──► Final Risk Tier
(Age, Sex, Site, etc.)    ──► 3-Dense-Block PyTorch ANN       ──► P(ANN) ──►
```

1. **MSPE-DeiT (Vision Transformer)**: DeiT-Tiny backbone structure ($16 \times 16$ patch size, 192 embed dimension, 12 attention heads) with dual Modality-Specific Patch Embedding projection layers (`patch_embed_dermoscopy` and `patch_embed_tbp`) that dynamically route input imagery.
2. **XGBoost Classifier**: Gradient boosted decision tree branch operating on engineered clinical tabular features.
3. **ANN (Artificial Neural Network)**: 3-dense-block PyTorch neural network (Linear $\rightarrow$ LayerNorm $\rightarrow$ ReLU $\rightarrow$ Dropout) trained for clinical tabular representation.
4. **Soft-Voting Ensemble**: Fuses all three calibrated probability branches:
   $$P_{\text{final}} = \frac{P_{\text{MSPE}} + P_{\text{XGB}} + P_{\text{ANN}}}{3}$$

### Risk Categorization & Decision Support
- 🟢 **Low Risk** ($< 0.25$): Routine clinical self-monitoring; re-screen if ABCDE changes occur.
- 🟡 **Moderate Risk** ($0.25 - 0.55$): Serial digital dermoscopy and clinical exam within 4–6 weeks.
- 🔴 **High Risk** ($> 0.55$): Immediate dermatological referral recommended for histological biopsy correlation.

---

## 📁 Repository Structure

```plaintext
MSPE_DeiT_Skin_Cancer_Mobile_Application/
├── backend/
│   ├── main.py                     # Unified FastAPI application (auth, assessments, inference, reports)
│   ├── database.py                 # SQLite database models & session helper
│   ├── requirements.txt            # Python dependencies (PyTorch, Timm, XGBoost, ReportLab, etc.)
│   ├── models/
│   │   ├── mspe_deit.py            # DeiT-Tiny with dual modality patch projection layers
│   │   ├── clinical_models.py      # 3-dense-block ANN & XGBoost classifiers
│   │   └── ensemble.py             # Soft-voting ensemble & risk classifier
│   ├── services/
│   │   ├── preprocessor.py         # Image tensor standardization & tabular feature encoding
│   │   └── pdf_report.py           # ReportLab clinical decision-support PDF generator
│   └── tests/
│       ├── test_models.py          # Pytest suite for MSPE-DeiT, ANN, XGBoost, & ensemble
│       ├── test_api.py             # Pytest suite for API endpoints, health, & PDF stream
│       └── test_e2e_workflow.py    # 20-step end-to-end integration test
├── mobile/                         # React Native + Expo mobile client (Apple Health / Linear UI)
│   ├── app/                        # Expo Router screen tree
│   │   ├── _layout.tsx             # Root layout with QueryClient & SafeAreaProvider
│   │   ├── index.tsx               # Splash / session gate
│   │   ├── onboarding.tsx          # 3-step multimodal orientation carousel
│   │   ├── login.tsx               # Secure investigator sign-in
│   │   ├── register.tsx            # Investigator account creation
│   │   ├── home.tsx                # Main dashboard (real stats, recent cases, CTA)
│   │   ├── history.tsx             # Searchable registry with status filters
│   │   ├── privacy.tsx             # Institutional consent management (Opt-in)
│   │   ├── profile.tsx             # Account settings & system architecture
│   │   ├── education.tsx           # ABCDE melanoma guide & multimodal pearls
│   │   └── assessment/
│   │       ├── new.tsx             # Step 1: Modality protocol check
│   │       ├── image.tsx           # Step 2: Image selection & modality picker
│   │       ├── clinical.tsx        # Step 3: Clinical metadata inputs
│   │       ├── review.tsx          # Step 4: Parameter review & multipart upload
│   │       ├── processing.tsx      # Real status stepper & inference trigger
│   │       ├── result.tsx          # Tri-branch probability bars & risk tier
│   │       ├── report.tsx          # Authenticated PDF download & sharing
│   │       ├── details.tsx         # Complete archived case record
│   │       └── explanation.tsx     # Attention overlays & feature attributions
│   ├── components/
│   │   └── UI.tsx                  # Reusable UI component suite (cards, buttons, badges, etc.)
│   ├── constants/
│   │   └── theme.ts                # Design tokens (Apple Health / Linear palette)
│   ├── services/
│   │   ├── api.ts                  # Axios client, JWT interceptor, Pydantic error formatter
│   │   └── upload.ts               # Platform-specific FormData builder (Web File vs Native dict)
│   └── store/
│       ├── session.ts              # Zustand authentication store
│       └── draft.ts                # Zustand assessment draft state
├── docs/
│   └── delivery/                   # Client delivery documentation & API specifications
└── README.md
```

---

## 🚀 Step-by-Step Run Commands

### 1. Backend Server Setup & Startup

Run in **PowerShell** or **Windows CMD**:

```powershell
# Navigate to backend directory
cd backend

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Start FastAPI server on port 8001
python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

- Interactive OpenAPI Swagger UI: 👉 **http://127.0.0.1:8001/docs**
- System Health Check: 👉 **http://127.0.0.1:8001/api/v1/health**

---

### 2. Mobile Application Setup & Startup (React Native + Expo)

In a **second terminal window**:

```powershell
# Navigate to mobile directory
cd mobile

# Start Expo dev server in web browser mode
npx expo start --web
```

The application will launch automatically at:  
👉 **http://localhost:8081** (or scan the terminal QR code in Expo Go for iOS/Android).

---

## 🧪 Automated Testing & Verification

### 1. Run Complete Backend Pytest Suite
```powershell
cd backend
python -m pytest tests -v
```
**Results: 12 passed in ~40s:**
- `tests/test_api.py::test_health_endpoint` PASSED
- `tests/test_api.py::test_multipart_screening_inference` PASSED
- `tests/test_api.py::test_screening_validation_errors` PASSED
- `tests/test_api.py::test_refresh_rotates_token` PASSED
- `tests/test_e2e_workflow.py::test_full_20_step_e2e_clinical_workflow` PASSED
- `tests/test_models.py::test_mspe_deit_forward_dermoscopy` PASSED
- `tests/test_models.py::test_mspe_deit_forward_3d_tbp` PASSED
- `tests/test_models.py::test_mspe_deit_modality_specific_weights` PASSED
- `tests/test_models.py::test_tabular_ann_forward_pass_and_range` PASSED
- `tests/test_models.py::test_xgboost_prediction_range` PASSED
- `tests/test_models.py::test_soft_voting_ensemble_accuracy` PASSED
- `tests/test_models.py::test_ensemble_risk_classification` PASSED

### 2. Frontend TypeScript & Production Web Export
```powershell
cd mobile

# Type check
npx tsc --noEmit
# Exit code: 0 (0 errors)

# Production Web Export
npx expo export -p web --output-dir dist
# 921 modules bundled with 0 errors
```

---

## ⚖️ Medical Disclaimer & Regulatory Notice

> **CAUTION: RESEARCH & EDUCATIONAL PROTOTYPE ONLY**  
> This application is an academic research software implementation based on the IEEE Access paper *MSPE-DeiT*. It is **NOT** a certified medical diagnostic device and does not provide clinical medical diagnoses or pathology reports. All risk levels and probabilities represent mathematical estimates. Any concerning skin lesion must be evaluated in person by a certified dermatologist for physical dermoscopy and histological biopsy.
