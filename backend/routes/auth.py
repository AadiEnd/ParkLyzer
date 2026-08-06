"""Google OAuth endpoints for FastAPI."""

import json
import logging
import os
import secrets
import urllib.parse
import urllib.request
from typing import Any

from dotenv import load_dotenv
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, RedirectResponse

load_dotenv()

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
GOOGLE_CALLBACK_URL = os.getenv("GOOGLE_CALLBACK_URL", "http://localhost:8000/auth/google/callback")
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
logger = logging.getLogger(__name__)

if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
    logger.error("Google OAuth env vars missing: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET")


def _build_redirect_uri(request: Request) -> str:
    return GOOGLE_CALLBACK_URL


def _build_frontend_redirect_url(error: str | None = None) -> str:
    target = FRONTEND_URL.rstrip("/")
    if not error:
        return target
    return f"{target}/?auth_error={urllib.parse.quote(error)}"


def _post_json(url: str, data: dict[str, str]) -> dict[str, Any]:
    body = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    with urllib.request.urlopen(req, timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))


def _get_json(url: str, headers: dict[str, str]) -> dict[str, Any]:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))


@router.get("/google/login")
def google_login(request: Request) -> RedirectResponse:
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return RedirectResponse(_build_frontend_redirect_url("Google OAuth is not configured"))

    state = secrets.token_urlsafe(16)
    request.session["oauth_state"] = state
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": _build_redirect_uri(request),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }
    auth_url = f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(auth_url)


@router.get("/google/callback")
def google_callback(request: Request, code: str | None = None, state: str | None = None) -> RedirectResponse:
    saved_state = request.session.get("oauth_state")
    if not code or not state or saved_state != state:
        return RedirectResponse(_build_frontend_redirect_url("Invalid Google OAuth callback"))

    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return RedirectResponse(_build_frontend_redirect_url("Google OAuth is not configured"))

    token_data = _post_json(
        GOOGLE_TOKEN_URL,
        {
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": _build_redirect_uri(request),
            "grant_type": "authorization_code",
        },
    )
    access_token = token_data.get("access_token")
    if not access_token:
        return RedirectResponse(_build_frontend_redirect_url("Google OAuth token exchange failed"))

    userinfo = _get_json(
        GOOGLE_USERINFO_URL,
        {"Authorization": f"Bearer {access_token}"},
    )
    request.session["user"] = {
        "id": userinfo.get("sub") or userinfo.get("email"),
        "name": userinfo.get("name"),
        "email": userinfo.get("email"),
        "picture": userinfo.get("picture"),
    }
    request.session.pop("oauth_state", None)
    return RedirectResponse(FRONTEND_URL)


@router.get("/me")
def get_me(request: Request) -> JSONResponse:
    user = request.session.get("user")
    if not user:
        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
    return JSONResponse(content={"user": user, "user_id": user.get("id") or user.get("email")})


@router.post("/logout")
def logout(request: Request) -> JSONResponse:
    request.session.clear()
    return JSONResponse(content={"ok": True})
