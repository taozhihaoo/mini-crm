def test_allowed_transition_persists(client, admin_headers, lead_factory):
    lead = lead_factory()
    response = client.patch(f"/api/leads/{lead['id']}/stage", json={"stage": "qualified"}, headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["stage"] == "qualified"

    # State is persisted - a fresh read confirms it.
    response = client.get(f"/api/leads/{lead['id']}", headers=admin_headers)
    assert response.json()["stage"] == "qualified"


def test_skipping_stages_is_rejected(client, admin_headers, lead_factory):
    lead = lead_factory()
    response = client.patch(f"/api/leads/{lead['id']}/stage", json={"stage": "won"}, headers=admin_headers)
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert "new" in detail and "won" in detail


def test_full_happy_path_to_won(client, admin_headers, lead_factory):
    lead = lead_factory()
    path = ["qualified", "proposal", "negotiation", "won"]
    for stage in path:
        response = client.patch(f"/api/leads/{lead['id']}/stage", json={"stage": stage}, headers=admin_headers)
        assert response.status_code == 200, response.text


def test_won_is_terminal(client, admin_headers, lead_factory):
    lead = lead_factory()
    for stage in ["qualified", "proposal", "negotiation", "won"]:
        client.patch(f"/api/leads/{lead['id']}/stage", json={"stage": stage}, headers=admin_headers)

    response = client.patch(f"/api/leads/{lead['id']}/stage", json={"stage": "new"}, headers=admin_headers)
    assert response.status_code == 422
    assert "terminal" in response.json()["detail"]


def test_lost_can_be_reopened(client, admin_headers, lead_factory):
    lead = lead_factory()
    client.patch(f"/api/leads/{lead['id']}/stage", json={"stage": "lost"}, headers=admin_headers)

    response = client.patch(f"/api/leads/{lead['id']}/stage", json={"stage": "new"}, headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["stage"] == "new"


def test_invalid_stage_value_rejected(client, admin_headers, lead_factory):
    lead = lead_factory()
    response = client.patch(
        f"/api/leads/{lead['id']}/stage", json={"stage": "super-won"}, headers=admin_headers
    )
    assert response.status_code == 422


def test_stage_change_is_audited(client, admin_headers, lead_factory):
    lead = lead_factory()
    client.patch(f"/api/leads/{lead['id']}/stage", json={"stage": "qualified"}, headers=admin_headers)

    response = client.get("/api/audit-logs", params={"action": "lead.stage_changed"}, headers=admin_headers)
    assert response.json()["total"] == 1
    entry = response.json()["items"][0]
    assert entry["metadata"] == {"from": "new", "to": "qualified"}
    assert entry["entity_type"] == "lead"
