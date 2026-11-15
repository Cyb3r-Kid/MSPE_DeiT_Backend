# MSPE-DeiT API Specification & Endpoint Documentation

The MSPE-DeiT backend serves a unified FastAPI service supporting both mobile client endpoints (`/api/v1/...`) and batch screening inference endpoints (`/api/...`).

## Base URL
- Local Development: `http://127.0.0.1:8001`
- Mobile API Base: `http://127.0.0.1:8001/api/v1`

---

## 1. Authentication & Identity Endpoints

### Register User
- **Route**: `POST /api/v1/auth/register` (also mirrored at `/api/auth/register`)
- **Status Code**: `201 Created`
- **Request Body**:
  ```json
  {
    "name": "Dr. Sarah Lin",
    "email": "sarah.lin@hospital.org",
    "password": "MinTwelveCharacterPassword123!"
  }
  ```
- **Response**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "486e9e...64_char_hex_token"
  }
  ```
- **Notes**: Password is authenticated using Argon2id. Consent is **not** automatically granted; explicit user consent is required before performing assessments.

### Login
- **Route**: `POST /api/v1/auth/login` (also mirrored at `/api/auth/login`)
- **Status Code**: `200 OK`
- **Request Body**:
  ```json
  {
    "email": "sarah.lin@hospital.org",
    "password": "MinTwelveCharacterPassword123!"
  }
  ```
- **Response**: `TokenPair` (`access_token` and `refresh_token`).

### Token Rotation
- **Route**: `POST /api/v1/auth/refresh`
- **Status Code**: `200 OK`
- **Request Body**:
  ```json
  {
    "refresh_token": "486e9e...64_char_hex_token"
  }
  ```
- **Response**: Rotated `TokenPair`. The old refresh token is marked as revoked in the database.

---

## 2. Privacy & Institutional Consent Endpoints

### Get Consent Status
- **Route**: `GET /api/v1/users/privacy`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response**:
  ```json
  {
    "consents": [
      {
        "type": "research_assessment",
        "version": "1",
        "granted_at": "2026-11-10T21:48:00+00:00",
        "revoked_at": null
      },
      {
        "type": "image_storage",
        "version": "1",
        "granted_at": "2026-11-10T21:48:05+00:00",
        "revoked_at": null
      }
    ],
    "retention": "Data remains until you delete an assessment or account."
  }
  ```

### Update / Revoke Consent
- **Route**: `POST /api/v1/users/consent`
- **Headers**: `Authorization: Bearer <access_token>`
- **Request Body**:
  ```json
  {
    "consent_type": "research_assessment",
    "consent_version": "1",
    "granted": true
  }
  ```
- **Response**: `{"granted": true}`

### Delete User Account & Wipe Data
- **Route**: `DELETE /api/v1/users/account`
- **Headers**: `Authorization: Bearer <access_token>`
- **Status Code**: `204 No Content`
- **Behavior**: Unlinks all stored lesion files on disk, removes audit logs, refresh tokens, and deletes user record.

---

## 3. Screening & Assessment Endpoints

### Create Assessment Record
- **Route**: `POST /api/v1/assessments`
- **Status Code**: `201 Created`
- **Headers**: `Authorization: Bearer <access_token>`
- **Prerequisite**: Active `research_assessment` consent. Returns HTTP 403 if revoked.
- **Request Body**:
  ```json
  {
    "modality": "dermoscopic",
    "clinical_metadata": {
      "age": 52,
      "sex": "female",
      "anatomical_location": "left forearm"
    }
  }
  ```
- **Response**:
  ```json
  {
    "id": 1,
    "modality": "dermoscopic",
    "clinical_metadata": { "age": 52, "sex": "female", "anatomical_location": "left forearm" },
    "status": "draft",
    "created_at": "2026-11-10T21:48:00",
    "completed_at": null,
    "has_image": false,
    "prediction": null
  }
  ```

### Upload Multipart Lesion Image
- **Route**: `POST /api/v1/assessments/{assessment_id}/image`
- **Headers**: `Authorization: Bearer <access_token>`, multipart form boundary
- **Prerequisite**: Active `image_storage` consent. Returns HTTP 403 if revoked.
- **Payload**: Multipart form-data with field name `"file"` as genuine `UploadFile`.
- **Validation**:
  - MIME: Must be `image/jpeg` or `image/png` (HTTP 415 on mismatch).
  - Size: Max 10 MB (HTTP 413 if exceeded).
  - Dimensions: Minimum 224x224 px, max 25 megapixels (HTTP 422 if invalid).
- **Response**: `{"ok": true, "assessment_id": 1}`

### Execute Multimodal Inference
- **Route**: `POST /api/v1/assessments/{assessment_id}/analyze`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response**: Full assessment object populated with prediction:
  ```json
  {
    "id": 1,
    "status": "completed",
    "prediction": {
      "model_version": "MSPE-DeiT-v1.0",
      "image_probability": 0.428,
      "xgboost_probability": 0.512,
      "ann_probability": 0.384,
      "ensemble_probability": 0.441,
      "threshold": 0.50,
      "calibration_version": "isotonic-v1"
    }
  }
  ```

### Retrieve Authenticated PDF Report
- **Route**: `GET /api/v1/assessments/{assessment_id}/report`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response**: Binary stream with `Content-Type: application/pdf`, starting with `%PDF-` header.
