# API

FastAPI publishes the full contract at `/docs` and `/openapi.json`.

Public: `GET /api/v1/health`, `/models/status`, `/models/metadata`; `POST /auth/register`, `/auth/login`, `/auth/refresh`.

Bearer access token required: `POST /auth/logout`, `GET /auth/me`, profile and consent routes, assessment CRUD, image upload, analysis, explanation, and PDF report. Account deletion is `DELETE /api/v1/users/account`. Assessment detail, report, and deletion are ownership scoped. `POST /assessments/{id}/analyze` returns 503 when artifacts are unavailable, 422 for unsupported modality or missing required fields. Image uploads require explicit active image-storage consent.
