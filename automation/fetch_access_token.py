"""Automate Zerodha login, obtain access_token, and update backend.

This script:
1. Loads Zerodha credentials / secrets from a .env file or environment variables.
2. Uses Selenium to perform headless login (user id + password + TOTP).
3. Generates a request_token and exchanges it for an access_token via the KiteConnect SDK.
4. Calls the QuantumLeap backend `/api/modules/auth/broker/token/update` endpoint so the
   backend always has a fresh token for the user.

Run:
    python automation/fetch_access_token.py

Prerequisites:
    pip install -r automation/requirements.txt
"""

from __future__ import annotations

import os
import time
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Optional

import pyotp
import requests
from dotenv import load_dotenv
from kiteconnect import KiteConnect
from requests import Response
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager


KITE_LOGIN_URL = (
    "https://kite.trade/connect/login"
    "?api_key={api_key}"
    "&v=3"
)
DEFAULT_BACKEND_UPDATE_URL = (
    "https://web-production-de0bc.up.railway.app"
    "/api/modules/auth/broker/token/update"
)


@dataclass
class ZerodhaConfig:
    api_key: str
    api_secret: str
    totp_secret: str
    user_id: str
    password: str
    token_output_path: Optional[str] = None
    backend_update_url: str = DEFAULT_BACKEND_UPDATE_URL
    backend_source_label: str = "automation"


def load_config() -> ZerodhaConfig:
    """Load configuration from environment / .env file."""
    load_dotenv()

    cfg = ZerodhaConfig(
        api_key=os.getenv("Z_API_KEY", "").strip(),
        api_secret=os.getenv("Z_API_SECRET", "").strip(),
        totp_secret=os.getenv("Z_TOTP_SECRET", "").strip(),
        user_id=os.getenv("Z_USER_ID", "").strip(),
        password=os.getenv("Z_PASSWORD", "").strip(),
        token_output_path=os.getenv("TOKEN_OUTPUT_PATH", "").strip() or None,
        backend_update_url=(os.getenv("BACKEND_UPDATE_URL", "").strip() or DEFAULT_BACKEND_UPDATE_URL),
        backend_source_label=os.getenv("BACKEND_SOURCE_LABEL", "automation") or "automation",
    )

    missing = [
        name for name, value in vars(cfg).items()
        if value in ("", None) and name not in {"token_output_path", "backend_source_label"}
    ]
    if missing:
        raise ValueError(f"Missing required config values: {missing}")

    return cfg


def generate_totp(totp_secret: str) -> str:
    totp = pyotp.TOTP(totp_secret)
    return totp.now()


@contextmanager
def selenium_driver():
    """Context manager that yields a headless Chrome driver."""
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(ChromeDriverManager().install(), options=options)
    try:
        yield driver
    finally:
        driver.quit()


def login_and_get_request_token(cfg: ZerodhaConfig) -> str:
    login_url = KITE_LOGIN_URL.format(api_key=cfg.api_key)

    with selenium_driver() as driver:
        driver.get(login_url)
        wait = WebDriverWait(driver, 20)

        # Step 1: user id + password
        user_field = wait.until(EC.presence_of_element_located((By.ID, "userid")))
        password_field = driver.find_element(By.ID, "password")
        user_field.clear()
        user_field.send_keys(cfg.user_id)
        password_field.clear()
        password_field.send_keys(cfg.password)
        driver.find_element(By.XPATH, "//button[@type='submit']").click()

        # Step 2: TOTP (two-factor)
        totp_code = generate_totp(cfg.totp_secret)
        totp_field = wait.until(EC.presence_of_element_located((By.ID, "totp")))
        totp_field.clear()
        totp_field.send_keys(totp_code)
        driver.find_element(By.XPATH, "//button[@type='submit']").click()

        # Step 3: wait for redirect URL containing request_token
        wait.until(lambda d: "request_token=" in d.current_url.lower())
        redirected_url = driver.current_url

        request_token = None
        for part in redirected_url.split("&"):
            if "request_token=" in part:
                request_token = part.split("request_token=")[-1]
                break

        if not request_token:
            raise RuntimeError("Unable to locate request_token in redirect URL")

        return request_token


def generate_access_token(cfg: ZerodhaConfig, request_token: str) -> dict:
    """Return session data containing access_token, refresh_token, etc."""
    kite = KiteConnect(api_key=cfg.api_key)
    session_data = kite.generate_session(request_token, api_secret=cfg.api_secret)
    access_token = session_data["access_token"]

    if cfg.token_output_path:
        with open(cfg.token_output_path, "w", encoding="utf-8") as f:
            f.write(access_token)

    return session_data


def notify_backend(cfg: ZerodhaConfig, session_data: dict, max_retries: int = 3, retry_delay: int = 5) -> None:
    """POST the updated token to the backend, retrying on failure."""
    payload = {
        "user_id": cfg.user_id,
        "access_token": session_data.get("access_token"),
        "expires_in": session_data.get("expires_in"),
        "expires_at": session_data.get("expires_at"),
        "source": cfg.backend_source_label,
    }

    if not payload["access_token"]:
        raise ValueError("Session data missing access_token")

    for attempt in range(1, max_retries + 1):
        try:
            response: Response = requests.post(
                cfg.backend_update_url,
                json=payload,
                timeout=20
            )

            if response.ok:
                print("Backend token update succeeded:", response.json())
                return

            print(
                f"Backend token update failed (attempt {attempt}) "
                f"status {response.status_code}: {response.text}"
            )

        except requests.RequestException as exc:
            print(f"Backend token update exception (attempt {attempt}): {exc}")

        if attempt < max_retries:
            sleep_for = retry_delay * attempt
            print(f"Retrying in {sleep_for} seconds...")
            time.sleep(sleep_for)

    raise RuntimeError("Unable to update backend with new access token after retries")


def main():
    cfg = load_config()
    print("Starting automated Zerodha login...")

    request_token = login_and_get_request_token(cfg)
    print(f"Request token received: {request_token}")

    session_data = generate_access_token(cfg, request_token)
    print("Access token generated successfully.")

    notify_backend(cfg, session_data)
    print("All done.")


if __name__ == "__main__":
    main()
