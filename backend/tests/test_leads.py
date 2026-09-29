def test_create_lead_defaults_owner_and_value(client, admin_headers, member_user, company_factory, contact_factory):
    company = company_factory()
    contact = contact_factory(company=company)

    response = client.post(
        "/api/leads",
        json={"company_id": company["id"], "contact_id": contact["id"], "title": "New platform"},
        headers=admin_headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["stage"] == "new"
    assert body["value"] == "0.00"  # money serialized with two decimals
    assert body["owner_id"]  # defaults to the authenticated user
    assert body["owner"]["full_name"]


def test_create_lead_contact_must_belong_to_company(client, admin_headers, company_factory, contact_factory):
    company_a = company_factory(name="A")
    company_b = company_factory(name="B")
    contact_b = contact_factory(company=company_b)

    response = client.post(
        "/api/leads",
        json={"company_id": company_a["id"], "contact_id": contact_b["id"], "title": "Mismatch"},
        headers=admin_headers,
    )
    assert response.status_code == 422
    assert "does not belong" in response.json()["detail"]


def test_create_lead_unknown_company(client, admin_headers, contact_factory):
    contact = contact_factory()
    response = client.post(
        "/api/leads",
        json={"company_id": "missing", "contact_id": contact["id"], "title": "X"},
        headers=admin_headers,
    )
    assert response.status_code == 422


def test_lead_with_owner_and_close_date(client, admin_headers, member_user, company_factory, contact_factory):
    company = company_factory()
    contact = contact_factory(company=company)
    response = client.post(
        "/api/leads",
        json={
            "company_id": company["id"],
            "contact_id": contact["id"],
            "title": "Owned deal",
            "value": "42000.50",
            "priority": "high",
            "source": "referral",
            "expected_close_date": "2026-11-15",
        },
        headers=admin_headers,
    )
    body = response.json()
    assert body["value"] == "42000.50"
    assert body["priority"] == "high"
    assert body["source"] == "referral"
    assert body["expected_close_date"] == "2026-11-15"


def test_update_lead(client, admin_headers, lead_factory):
    lead = lead_factory()
    response = client.patch(
        f"/api/leads/{lead['id']}", json={"value": "25000", "priority": "high"}, headers=admin_headers
    )
    assert response.status_code == 200
    assert response.json()["value"] == "25000.00"
    assert response.json()["priority"] == "high"


def test_lead_search_and_filters(client, admin_headers, company_factory, contact_factory, lead_factory):
    company = company_factory(name="Filter Co")
    contact = contact_factory(company=company)
    lead_factory(title="Website redesign", company=company, contact=contact, stage="new", priority="low")
    lead_factory(title="Mobile app", company=company, contact=contact, stage="proposal", priority="high")

    response = client.get("/api/leads", params={"search": "mobile"}, headers=admin_headers)
    assert response.json()["total"] == 1

    response = client.get("/api/leads", params={"stage": "proposal"}, headers=admin_headers)
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["title"] == "Mobile app"

    response = client.get("/api/leads", params={"priority": "high"}, headers=admin_headers)
    assert response.json()["total"] == 1

    response = client.get("/api/leads", params={"company_id": company["id"]}, headers=admin_headers)
    assert response.json()["total"] == 2

    response = client.get("/api/leads", params={"stage": "bogus"}, headers=admin_headers)
    assert response.status_code == 422


def test_lead_sorting_by_value(client, admin_headers, lead_factory):
    lead_factory(title="Small", value="1000")
    lead_factory(title="Large", value="90000")

    response = client.get(
        "/api/leads", params={"sort_by": "value", "order": "desc"}, headers=admin_headers
    )
    assert response.json()["items"][0]["title"] == "Large"


def test_lead_pagination(client, admin_headers, lead_factory):
    for i in range(12):
        lead_factory(title=f"Lead {i:02d}")

    response = client.get("/api/leads", params={"page": 2, "page_size": 10}, headers=admin_headers)
    body = response.json()
    assert body["total"] == 12
    assert len(body["items"]) == 2


def test_lead_archive_excludes_and_blocks_stage_change(client, admin_headers, lead_factory):
    lead = lead_factory()
    client.post(f"/api/leads/{lead['id']}/archive", headers=admin_headers)

    response = client.get("/api/leads", headers=admin_headers)
    assert response.json()["total"] == 0

    response = client.patch(f"/api/leads/{lead['id']}/stage", json={"stage": "qualified"}, headers=admin_headers)
    assert response.status_code == 422
    assert "Archived" in response.json()["detail"]

    response = client.post(f"/api/leads/{lead['id']}/unarchive", headers=admin_headers)
    assert response.status_code == 200
