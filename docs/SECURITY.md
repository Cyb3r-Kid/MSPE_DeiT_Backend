# Security and privacy

This is a local academic prototype. It uses Argon2, expiring JWT access tokens, hashed rotating refresh tokens, authorization checks, upload format/size/dimension checks, private image storage, and explicit consent. Images and clinical data are not sent to third-party analytics. Deleting an assessment removes its stored image and prediction. Deleting an account removes records and images.

Deployment still requires HTTPS, persistent secrets management, backup and retention policy, abuse/rate limiting, malware scanning, encryption at rest, audit review, and independent security assessment. The current upload quality thresholds are engineering defaults and not medically validated. The prototype is not regulatory compliant or clinically approved.
