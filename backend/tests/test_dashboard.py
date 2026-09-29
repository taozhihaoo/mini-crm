from datetime import UTC, datetime, timedelta


def test_dashboard_requires_auth(client):
    assert client.get("/api/dashboard").status_code == 401


def test_dashboard_counts(client, admin_headers, company_factory, contact_factory, lead_factory):
    company = company_factory()
    contact = contact_factory(company=company)
    lead_factory(title="Open one", value="10000", company=company, contact=contact)
    lead_factory(title="Open two", value="5000", stage="qualified", company=company, contact=contact)
    lead_factory(title="Won one", value="7000", stage="won", company=company, contact=contact)
    lead_factory(title="Lost one", value="3000", stage="lost", company=company, contact=contact)

    response = client.get("/api/dashboard", headers=admin_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total_companies"] == 1
    assert body["total_contacts"] == 1
    assert body["open_leads"] == 2
    assert body["won_leads"] == 1
    assert body["lost_leads"] == 1
    assert body["pipeline_value"] == "15000.00"

    stage_by_name = {entry["stage"]: entry for entry in body["pipeline"]}
    assert stage_by_name["new"]["count"] == 1
    assert stage_by_name["new"]["value"] == "10000.00"
    assert stage_by_name["won"]["count"] == 1
    assert len(body["pipeline"]) == 6


def test_dashboard_task_buckets(client, admin_headers):
    now = datetime.now(UTC)

    client.post(
        "/api/tasks",
        json={"title": "Due today", "due_at": (now + timedelta(hours=2)).isoformat()},
        headers=admin_headers,
    )
    client.post(
        "/api/tasks",
        json={"title": "Overdue", "due_at": (now - timedelta(days=2)).isoformat()},
        headers=admin_headers,
    )
    client.post(
        "/api/tasks",
        json={"title": "Upcoming", "due_at": (now + timedelta(days=5)).isoformat()},
        headers=admin_headers,
    )
    # Cancelled tasks never appear in buckets or counts.
    client.post(
        "/api/tasks",
        json={
            "title": "Cancelled overdue",
            "due_at": (now - timedelta(days=1)).isoformat(),
        },
        headers=admin_headers,
    )
    # Find it and cancel it (status transitions always go through PATCH).
    tasks = client.get("/api/tasks", params={"search": "Cancelled overdue"}, headers=admin_headers).json()
    client.patch(
        f"/api/tasks/{tasks['items'][0]['id']}", json={"status": "cancelled"}, headers=admin_headers
    )

    response = client.get("/api/dashboard", headers=admin_headers)
    body = response.json()
    assert body["tasks_due_today"] == 1
    assert body["tasks_overdue"] == 1
    assert [t["title"] for t in body["due_today_tasks"]] == ["Due today"]
    assert [t["title"] for t in body["overdue_tasks"]] == ["Overdue"]
    assert [t["title"] for t in body["upcoming_tasks"]] == ["Upcoming"]


def test_dashboard_recent_activities(client, admin_headers, lead_factory):
    lead = lead_factory()
    client.post(
        "/api/activities",
        json={"lead_id": lead["id"], "type": "call", "subject": "Recent call"},
        headers=admin_headers,
    )
    response = client.get("/api/dashboard", headers=admin_headers)
    assert response.json()["recent_activities"][0]["subject"] == "Recent call"
    assert response.json()["recent_activities"][0]["lead"]["id"] == lead["id"]
