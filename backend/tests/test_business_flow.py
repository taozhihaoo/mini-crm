"""One integration test walking the complete business chain end to end:

login -> company -> contact -> lead -> stage change -> activity -> task
-> AI (mock) -> audit trail.
"""

from datetime import UTC, datetime, timedelta


def test_full_business_chain(client, admin_headers, member_headers):
    # 1. Company
    company = client.post(
        "/api/companies",
        json={"name": "Chain Co", "industry": "Software"},
        headers=admin_headers,
    ).json()

    # 2. Contact
    contact = client.post(
        "/api/contacts",
        json={
            "company_id": company["id"],
            "first_name": "Chain",
            "last_name": "Tester",
            "email": "chain@chainco.example.com",
        },
        headers=admin_headers,
    ).json()

    # 3. Lead (owner defaults to the acting user)
    lead = client.post(
        "/api/leads",
        json={
            "company_id": company["id"],
            "contact_id": contact["id"],
            "title": "Chain pilot project",
            "value": "25000",
        },
        headers=admin_headers,
    ).json()

    # 4. Guarded stage change: new -> qualified -> proposal
    assert (
        client.patch(f"/api/leads/{lead['id']}/stage", json={"stage": "qualified"}, headers=admin_headers).status_code
        == 200
    )
    response = client.patch(
        f"/api/leads/{lead['id']}/stage", json={"stage": "proposal"}, headers=admin_headers
    )
    assert response.status_code == 200
    assert response.json()["stage"] == "proposal"

    # 5. Activity
    activity = client.post(
        "/api/activities",
        json={"lead_id": lead["id"], "type": "call", "subject": "Chain discovery call"},
        headers=admin_headers,
    ).json()
    assert activity["lead"]["id"] == lead["id"]

    # 6. Task with a due date
    due = (datetime.now(UTC) + timedelta(days=2)).isoformat()
    task = client.post(
        "/api/tasks",
        json={"title": "Send chain proposal", "related_lead_id": lead["id"], "due_at": due},
        headers=admin_headers,
    ).json()
    assert task["status"] == "open"

    # 7. AI (deterministic mock provider)
    summary = client.post(f"/api/ai/leads/{lead['id']}/summary", headers=admin_headers).json()
    assert summary["provider"] == "mock"
    assert "Chain Co" in summary["summary"]

    # 8. Lead detail shows the timeline and task
    detail = client.get(f"/api/leads/{lead['id']}", headers=admin_headers).json()
    assert detail["stage"] == "proposal"
    assert any(a["subject"] == "Chain discovery call" for a in detail["activities"])
    assert any(t["title"] == "Send chain proposal" for t in detail["tasks"])

    # 9. Audit trail recorded the whole chain (admin only)
    audit = client.get("/api/audit-logs", params={"page_size": 50}, headers=admin_headers).json()
    actions = {entry["action"] for entry in audit["items"]}
    expected = {
        "auth.login",
        "company.created",
        "contact.created",
        "lead.created",
        "lead.stage_changed",
        "activity.created",
        "task.created",
        "ai.summary",
    }
    assert expected.issubset(actions)
    # AI audit carries the provider usage contract: null when the provider reports none.
    ai_entry = next(entry for entry in audit["items"] if entry["action"] == "ai.summary")
    assert ai_entry["metadata"]["provider"] == "mock"
    assert ai_entry["metadata"]["usage"] is None

    # 10. Member cannot see the audit trail; unauthenticated cannot see the lead
    assert client.get("/api/audit-logs", headers=member_headers).status_code == 403
    assert client.get(f"/api/leads/{lead['id']}").status_code == 401
