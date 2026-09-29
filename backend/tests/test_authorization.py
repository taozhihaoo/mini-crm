def test_member_cannot_manage_users(client, member_headers):
    assert client.get("/api/users", headers=member_headers).status_code == 403

    response = client.post(
        "/api/users",
        json={"email": "new@example.com", "password": "Password1", "full_name": "New User"},
        headers=member_headers,
    )
    assert response.status_code == 403


def test_member_cannot_view_audit_logs(client, member_headers):
    assert client.get("/api/audit-logs", headers=member_headers).status_code == 403


def test_admin_can_manage_users(client, admin_headers):
    response = client.get("/api/users", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["total"] >= 1


def test_admin_can_create_and_update_user(client, admin_headers):
    response = client.post(
        "/api/users",
        json={"email": "created@example.com", "password": "Password1", "full_name": "Created User"},
        headers=admin_headers,
    )
    assert response.status_code == 201
    user_id = response.json()["id"]
    assert response.json()["role"] == "member"

    response = client.patch(f"/api/users/{user_id}", json={"role": "admin"}, headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["role"] == "admin"


def test_member_can_perform_normal_crm_operations(client, member_headers):
    response = client.post(
        "/api/companies", json={"name": "Member Co"}, headers=member_headers
    )
    assert response.status_code == 201


def test_unauthenticated_requests_are_rejected(client):
    assert client.get("/api/companies").status_code == 401
    assert client.get("/api/leads").status_code == 401
    assert client.get("/api/dashboard").status_code == 401
