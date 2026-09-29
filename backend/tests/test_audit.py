def test_crud_actions_are_audited(client, admin_headers):
    company = client.post("/api/companies", json={"name": "Audit Co"}, headers=admin_headers).json()
    client.patch(f"/api/companies/{company['id']}", json={"industry": "Software"}, headers=admin_headers)
    client.post(f"/api/companies/{company['id']}/archive", headers=admin_headers)

    response = client.get("/api/audit-logs", headers=admin_headers)
    actions = [item["action"] for item in response.json()["items"]]
    assert "company.created" in actions
    assert "company.updated" in actions
    assert "company.archived" in actions


def test_audit_entry_payload(client, admin_headers, lead_factory):
    lead = lead_factory()
    client.patch(f"/api/leads/{lead['id']}/stage", json={"stage": "qualified"}, headers=admin_headers)

    response = client.get(
        "/api/audit-logs", params={"action": "lead.stage_changed"}, headers=admin_headers
    )
    entry = response.json()["items"][0]
    assert entry["user_id"]
    assert entry["user_email"] == "admin@example.com"
    assert entry["entity_type"] == "lead"
    assert entry["entity_id"] == lead["id"]
    assert entry["metadata"] == {"from": "new", "to": "qualified"}
    assert entry["created_at"]


def test_audit_update_metadata_lists_changed_fields(client, admin_headers, company_factory):
    company = company_factory()
    client.patch(
        f"/api/companies/{company['id']}", json={"name": "Renamed", "phone": "+1-555"}, headers=admin_headers
    )
    response = client.get(
        "/api/audit-logs", params={"action": "company.updated"}, headers=admin_headers
    )
    entry = response.json()["items"][0]
    assert set(entry["metadata"]["changed"]) == {"name", "phone"}


def test_audit_filter_by_entity_type(client, admin_headers, company_factory, contact_factory):
    company = company_factory()
    contact_factory(company=company)
    response = client.get(
        "/api/audit-logs", params={"entity_type": "contact"}, headers=admin_headers
    )
    assert response.json()["total"] == 1


def test_ai_actions_are_audited(client, admin_headers, lead_factory):
    lead = lead_factory()
    client.post(f"/api/ai/leads/{lead['id']}/summary", headers=admin_headers)
    client.post(f"/api/ai/leads/{lead['id']}/follow-up", headers=admin_headers)

    response = client.get("/api/audit-logs", params={"action": "ai.summary"}, headers=admin_headers)
    assert response.json()["total"] == 1
    entry = response.json()["items"][0]
    assert entry["metadata"]["provider"] == "mock"


def test_audit_never_stores_passwords(client, admin_headers):
    client.post(
        "/api/users",
        json={"email": "audited@example.com", "password": "S3cretPassword!", "full_name": "Audited"},
        headers=admin_headers,
    )
    response = client.get("/api/audit-logs", params={"page_size": 100}, headers=admin_headers)
    for entry in response.json()["items"]:
        assert "S3cretPassword!" not in str(entry["metadata"])
        assert "password" not in str(entry["metadata"]).lower()


def test_task_lifecycle_is_audited(client, admin_headers):
    task = client.post("/api/tasks", json={"title": "Audit task"}, headers=admin_headers).json()
    client.patch(f"/api/tasks/{task['id']}", json={"status": "completed"}, headers=admin_headers)

    response = client.get("/api/audit-logs", params={"action": "task.completed"}, headers=admin_headers)
    assert response.json()["total"] == 1
