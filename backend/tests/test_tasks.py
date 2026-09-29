from datetime import UTC, datetime, timedelta


def test_create_task_defaults(client, admin_headers, member_user):
    response = client.post("/api/tasks", json={"title": "Call the customer"}, headers=admin_headers)
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "open"
    assert body["priority"] == "medium"
    assert body["assigned_to"]  # defaults to creator


def test_create_task_with_references(client, admin_headers, lead_factory, contact_factory, member_user):
    lead = lead_factory()
    contact = contact_factory()
    response = client.post(
        "/api/tasks",
        json={
            "title": "Send proposal",
            "related_lead_id": lead["id"],
            "related_contact_id": contact["id"],
            "due_at": "2026-10-10T17:00:00Z",
            "priority": "high",
        },
        headers=admin_headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["related_lead"]["id"] == lead["id"]
    assert body["due_at"].startswith("2026-10-10")


def test_task_validation_errors(client, admin_headers):
    assert client.post("/api/tasks", json={"description": "no title"}, headers=admin_headers).status_code == 422
    assert (
        client.post(
            "/api/tasks", json={"title": "X", "assigned_to": "ghost-user"}, headers=admin_headers
        ).status_code
        == 422
    )


def test_complete_and_cancel_task(client, admin_headers):
    task = client.post("/api/tasks", json={"title": "Follow up"}, headers=admin_headers).json()

    response = client.patch(f"/api/tasks/{task['id']}", json={"status": "completed"}, headers=admin_headers)
    assert response.json()["status"] == "completed"

    task2 = client.post("/api/tasks", json={"title": "Cancel me"}, headers=admin_headers).json()
    response = client.patch(f"/api/tasks/{task2['id']}", json={"status": "cancelled"}, headers=admin_headers)
    assert response.json()["status"] == "cancelled"


def test_task_filters(client, admin_headers):
    now = datetime.now(UTC)
    client.post(
        "/api/tasks",
        json={"title": "Soon", "due_at": (now + timedelta(hours=2)).isoformat()},
        headers=admin_headers,
    )
    client.post(
        "/api/tasks",
        json={"title": "Later", "due_at": (now + timedelta(days=5)).isoformat()},
        headers=admin_headers,
    )
    done = client.post("/api/tasks", json={"title": "Done"}, headers=admin_headers).json()
    client.patch(f"/api/tasks/{done['id']}", json={"status": "completed"}, headers=admin_headers)

    response = client.get("/api/tasks", params={"status": "open"}, headers=admin_headers)
    assert response.json()["total"] == 2

    response = client.get(
        "/api/tasks", params={"due_before": (now + timedelta(days=1)).isoformat()}, headers=admin_headers
    )
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["title"] == "Soon"

    response = client.get(
        "/api/tasks", params={"due_after": (now + timedelta(days=1)).isoformat()}, headers=admin_headers
    )
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["title"] == "Later"


def test_task_requires_auth(client):
    assert client.get("/api/tasks").status_code == 401
