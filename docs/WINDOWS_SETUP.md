# Windows setup

Install Python 3.12 and Node.js compatible with Expo SDK 57. Use PowerShell. If PowerShell blocks activation, invoke `.venv\Scripts\python.exe` directly. Set `JWT_SECRET` in the backend process environment, for example `$env:JWT_SECRET = '<your random 32+ character secret>'`. Run backend commands from `backend`; ML commands from repository root. SQLite and `private_uploads` are local to the backend working directory unless changed with environment variables.
