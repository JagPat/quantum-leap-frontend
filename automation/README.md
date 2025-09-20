# Zerodha Access Token Automation

This script drives a headless Chromium session to log into Kite, generates a
request token, exchanges it for an access token, and immediately informs the
QuantumLeap backend via `POST /api/modules/auth/broker/token/update`.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r automation/requirements.txt
```

Create an `.env` file alongside the project root (or set environment variables
in your runner):

```
Z_API_KEY=your_api_key
Z_API_SECRET=your_api_secret
Z_TOTP_SECRET=base32_totp_secret
Z_USER_ID=your_user
Z_PASSWORD=your_password
TOKEN_OUTPUT_PATH=access_token.txt           # optional
BACKEND_UPDATE_URL=https://web-production-de0bc.up.railway.app/api/modules/auth/broker/token/update
BACKEND_SOURCE_LABEL=automation              # optional label in backend logs
```

## Run

```
python automation/fetch_access_token.py
```

The script prints the new `request_token`, the generated `access_token`, and
the backend response.  On success, the backend immediately persists the token
(using commit `2dd2f80` or later).

## Scheduling / CI

- **Cron**: add a daily cron job that activates the virtualenv and runs the
  script.  Ensure environment variables are available.
- **GitHub Actions**: create a workflow with `schedule:` plus a job that
  installs dependencies and executes the script.  Store secrets in GH Actions
  secrets.

Both approaches should monitor the exit code; a non‑zero exit indicates the
backend could not be updated.
