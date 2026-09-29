from datetime import UTC

from tests.conftest import login, make_user


def test_login_success(client, admin_user):
    response = client.post(
        "/api/auth/login", json={"email": "admin@example.com", "password": "SuperSecret1"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "admin@example.com"
    assert body["user"]["role"] == "admin"
    assert "password" not in body["user"]
    assert "password_hash" not in body["user"]


def test_login_wrong_password(client, admin_user):
    response = client.post(
        "/api/auth/login", json={"email": "admin@example.com", "password": "wrong-password"}
    )
    assert response.status_code == 401


def test_login_unknown_user(client):
    response = client.post(
        "/api/auth/login", json={"email": "nobody@example.com", "password": "whatever123"}
    )
    assert response.status_code == 401


def test_login_invalid_payload(client):
    response = client.post("/api/auth/login", json={"email": "not-an-email", "password": "x"})
    assert response.status_code == 422


def test_me_requires_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_rejects_tampered_token(client):
    headers = {"Authorization": "Bearer not-a-real-token"}
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_me_rejects_expired_token(client, admin_user):
    from datetime import datetime, timedelta

    import jwt as pyjwt

    from app.core.config import get_settings

    settings = get_settings()
    expired = pyjwt.encode(
        {
            "sub": str(admin_user.id),
            "iat": datetime.now(UTC) - timedelta(hours=2),
            "exp": datetime.now(UTC) - timedelta(hours=1),
        },
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )
    headers = {"Authorization": f"Bearer {expired}"}
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_me_returns_current_user(client, admin_headers):
    response = client.get("/api/auth/me", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "admin@example.com"


def test_change_password_flow(client, admin_headers):
    response = client.post(
        "/api/auth/change-password",
        json={"current_password": "wrong", "new_password": "NewPassword1"},
        headers=admin_headers,
    )
    assert response.status_code == 422

    response = client.post(
        "/api/auth/change-password",
        json={"current_password": "SuperSecret1", "new_password": "NewPassword1"},
        headers=admin_headers,
    )
    assert response.status_code == 204

    # Old password no longer works, new one does.
    assert (
        client.post(
            "/api/auth/login", json={"email": "admin@example.com", "password": "SuperSecret1"}
        ).status_code
        == 401
    )
    login(client, "admin@example.com", "NewPassword1")


def test_deactivated_user_cannot_login_or_use_token(client, admin_headers, member_headers):
    member_id = client.get("/api/auth/me", headers=member_headers).json()["id"]
    response = client.patch(
        f"/api/users/{member_id}", json={"is_active": False}, headers=admin_headers
    )
    assert response.status_code == 200

    assert (
        client.post(
            "/api/auth/login", json={"email": "member@example.com", "password": "SuperSecret1"}
        ).status_code
        == 401
    )
    assert client.get("/api/auth/me", headers=member_headers).status_code == 401


def test_password_is_never_stored_in_plaintext(client):
    user = make_user(email="hashcheck@example.com", password="SuperSecret1")
    assert user.password_hash != "SuperSecret1"
    assert user.password_hash.startswith("$2")  # bcrypt format
