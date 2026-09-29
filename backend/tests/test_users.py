def test_create_user_validation(client, admin_headers):
    response = client.post(
        "/api/users",
        json={"email": "short@example.com", "password": "short", "full_name": "Short"},
        headers=admin_headers,
    )
    assert response.status_code == 422

    response = client.post(
        "/api/users",
        json={"email": "not-an-email", "password": "LongEnough1", "full_name": "X"},
        headers=admin_headers,
    )
    assert response.status_code == 422


def test_create_duplicate_user(client, admin_headers):
    payload = {"email": "dupe@example.com", "password": "Password1", "full_name": "Dupe"}
    assert client.post("/api/users", json=payload, headers=admin_headers).status_code == 201
    assert client.post("/api/users", json=payload, headers=admin_headers).status_code == 409


def test_user_list_pagination(client, admin_headers):
    for i in range(7):
        client.post(
            "/api/users",
            json={"email": f"user{i}@example.com", "password": "Password1", "full_name": f"User {i}"},
            headers=admin_headers,
        )
    response = client.get("/api/users", params={"page": 1, "page_size": 5}, headers=admin_headers)
    body = response.json()
    assert body["total"] >= 8
    assert len(body["items"]) == 5


def test_admin_cannot_deactivate_self(client, admin_headers, admin_user):
    me = client.get("/api/auth/me", headers=admin_headers).json()
    response = client.patch(f"/api/users/{me['id']}", json={"is_active": False}, headers=admin_headers)
    assert response.status_code == 422
    assert "own account" in response.json()["detail"]


def test_reset_user_password(client, admin_headers):
    created = client.post(
        "/api/users",
        json={"email": "reset@example.com", "password": "Password1", "full_name": "Reset"},
        headers=admin_headers,
    ).json()

    response = client.patch(f"/api/users/{created['id']}", json={"password": "NewPassword2"}, headers=admin_headers)
    assert response.status_code == 200

    login = client.post("/api/auth/login", json={"email": "reset@example.com", "password": "NewPassword2"})
    assert login.status_code == 200
