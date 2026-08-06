import os

from fastapi.testclient import TestClient

from backend.main import app


def test_google_login_redirects_when_oauth_is_not_configured(monkeypatch):
    monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)
    monkeypatch.delenv("GOOGLE_CLIENT_SECRET", raising=False)
    monkeypatch.setenv("FRONTEND_URL", "http://localhost:5173")

    client = TestClient(app)
    response = client.get("/auth/google/login", follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"].startswith("http://localhost:5173/?auth_error=")
