"""AI tests using the mock provider - fully offline, deterministic, no real API calls."""


def test_summary_is_generated_and_deterministic(client, admin_headers, lead_factory):
    lead = lead_factory(title="Deterministic deal")
    first = client.post(f"/api/ai/leads/{lead['id']}/summary", headers=admin_headers).json()
    second = client.post(f"/api/ai/leads/{lead['id']}/summary", headers=admin_headers).json()

    assert first["provider"] == "mock"
    assert first["summary"]
    assert first == second  # deterministic output


def test_summary_reflects_lead_context(client, admin_headers, company_factory, contact_factory, lead_factory):
    company = company_factory(name="Context Co", industry="Healthcare")
    contact = contact_factory(company=company, email="ctx@context.example.com")
    lead = lead_factory(
        title="Context deal", company=company, contact=contact, value="55000", stage="negotiation"
    )
    client.post(
        "/api/activities",
        json={"lead_id": lead["id"], "type": "meeting", "subject": "Contract walkthrough"},
        headers=admin_headers,
    )

    summary = client.post(f"/api/ai/leads/{lead['id']}/summary", headers=admin_headers).json()["summary"]
    assert "Context Co" in summary
    assert "negotiation" in summary.lower()
    assert "Contract walkthrough" in summary


def test_priority_returns_valid_enum_and_reasoning(client, admin_headers, lead_factory):
    lead = lead_factory(value="90000", stage="negotiation", priority="high")
    body = client.post(f"/api/ai/leads/{lead['id']}/priority", headers=admin_headers).json()

    assert body["priority"] in {"low", "medium", "high"}
    assert body["reasoning"]
    assert body["provider"] == "mock"

    # A big late-stage deal with activity scores high.
    assert body["priority"] == "high"


def test_priority_low_for_small_early_deal(client, admin_headers, lead_factory):
    lead = lead_factory(title="Tiny deal", value="500", stage="new", priority="low")
    body = client.post(f"/api/ai/leads/{lead['id']}/priority", headers=admin_headers).json()
    assert body["priority"] == "low"


def test_follow_up_draft(client, admin_headers, company_factory, contact_factory, lead_factory):
    company = company_factory(name="Draft Co")
    contact = contact_factory(company=company, email="paul@draft.example.com", first_name="Paul")
    lead = lead_factory(title="Draft deal", company=company, contact=contact)

    body = client.post(f"/api/ai/leads/{lead['id']}/follow-up", headers=admin_headers).json()
    assert body["subject"]
    assert "Draft deal" in body["subject"]
    assert "Paul" in body["body"]  # greets the contact by first name
    assert body["provider"] == "mock"


def test_ai_unknown_lead_404(client, admin_headers):
    assert client.post("/api/ai/leads/missing/summary", headers=admin_headers).status_code == 404


def test_ai_requires_auth(client, lead_factory):
    lead = lead_factory()
    assert client.post(f"/api/ai/leads/{lead['id']}/summary").status_code == 401
