def test_create_activity_linked_to_lead(client, admin_headers, lead_factory):
    lead = lead_factory()
    response = client.post(
        "/api/activities",
        json={"lead_id": lead["id"], "type": "call", "subject": "Discovery call", "content": "Good call."},
        headers=admin_headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["type"] == "call"
    assert body["lead"]["id"] == lead["id"]
    assert body["occurred_at"]


def test_activity_requires_a_link(client, admin_headers):
    response = client.post(
        "/api/activities", json={"type": "note", "subject": "Floating note"}, headers=admin_headers
    )
    assert response.status_code == 422


def test_activity_with_unknown_lead(client, admin_headers):
    response = client.post(
        "/api/activities", json={"lead_id": "missing", "type": "note", "subject": "X"}, headers=admin_headers
    )
    assert response.status_code == 422


def test_activity_with_custom_timestamp(client, admin_headers, lead_factory):
    lead = lead_factory()
    response = client.post(
        "/api/activities",
        json={"lead_id": lead["id"], "type": "meeting", "subject": "Retro", "occurred_at": "2026-09-01T10:00:00Z"},
        headers=admin_headers,
    )
    assert response.status_code == 201
    assert response.json()["occurred_at"].startswith("2026-09-01")


def test_timeline_is_chronological_desc(client, admin_headers, lead_factory):
    lead = lead_factory()
    client.post(
        "/api/activities",
        json={"lead_id": lead["id"], "type": "call", "subject": "Older", "occurred_at": "2026-09-01T10:00:00Z"},
        headers=admin_headers,
    )
    client.post(
        "/api/activities",
        json={"lead_id": lead["id"], "type": "email", "subject": "Newer", "occurred_at": "2026-09-15T10:00:00Z"},
        headers=admin_headers,
    )

    response = client.get("/api/activities", params={"lead_id": lead["id"]}, headers=admin_headers)
    subjects = [item["subject"] for item in response.json()["items"]]
    assert subjects == ["Newer", "Older"]


def test_activity_filter_by_type(client, admin_headers, lead_factory):
    lead = lead_factory()
    client.post("/api/activities", json={"lead_id": lead["id"], "type": "call", "subject": "A"}, headers=admin_headers)
    client.post("/api/activities", json={"lead_id": lead["id"], "type": "note", "subject": "B"}, headers=admin_headers)

    response = client.get("/api/activities", params={"type": "note"}, headers=admin_headers)
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["subject"] == "B"


def test_update_activity(client, admin_headers, lead_factory):
    lead = lead_factory()
    created = client.post(
        "/api/activities", json={"lead_id": lead["id"], "type": "note", "subject": "Draft"}, headers=admin_headers
    ).json()

    response = client.patch(
        f"/api/activities/{created['id']}", json={"subject": "Final note"}, headers=admin_headers
    )
    assert response.status_code == 200
    assert response.json()["subject"] == "Final note"
