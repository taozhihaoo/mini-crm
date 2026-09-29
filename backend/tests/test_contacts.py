def test_create_and_get_contact(client, admin_headers, company_factory, contact_factory):
    company = company_factory()
    contact = contact_factory(company=company, email="jane@example.com")

    response = client.get(f"/api/contacts/{contact['id']}", headers=admin_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["company_id"] == company["id"]
    assert body["full_name"] == "Jane Doe"
    assert body["company"]["name"] == company["name"]


def test_create_contact_duplicate_email(client, admin_headers, company_factory, contact_factory):
    company = company_factory()
    contact_factory(company=company, email="dupe@example.com")

    response = client.post(
        "/api/contacts",
        json={
            "company_id": company["id"],
            "first_name": "Other",
            "last_name": "Person",
            "email": "DUPE@example.com",
        },
        headers=admin_headers,
    )
    assert response.status_code == 409


def test_create_contact_unknown_company(client, admin_headers):
    response = client.post(
        "/api/contacts",
        json={"company_id": "nope", "first_name": "A", "last_name": "B", "email": "ab@example.com"},
        headers=admin_headers,
    )
    assert response.status_code == 422


def test_update_contact(client, admin_headers, company_factory, contact_factory):
    contact = contact_factory()
    response = client.patch(
        f"/api/contacts/{contact['id']}",
        json={"job_title": "CTO", "phone": "+1-555-0199"},
        headers=admin_headers,
    )
    assert response.status_code == 200
    assert response.json()["job_title"] == "CTO"


def test_contact_archive(client, admin_headers, company_factory, contact_factory):
    contact = contact_factory()
    assert (
        client.post(f"/api/contacts/{contact['id']}/archive", headers=admin_headers).json()["archived"]
        is True
    )

    response = client.get("/api/contacts", headers=admin_headers)
    assert response.json()["total"] == 0


def test_contact_search(client, admin_headers, company_factory, contact_factory):
    company = company_factory()
    contact_factory(company=company, email="alpha@example.com")
    contact_factory(company=company, first_name="Zack", email="zeta@example.com")

    response = client.get("/api/contacts", params={"search": "zack"}, headers=admin_headers)
    assert response.json()["total"] == 1

    response = client.get("/api/contacts", params={"search": "alpha@"}, headers=admin_headers)
    assert response.json()["total"] == 1


def test_contact_filter_by_company(client, admin_headers, company_factory, contact_factory):
    company_a = company_factory(name="A")
    company_b = company_factory(name="B")
    contact_factory(company=company_a, email="a@example.com")
    contact_factory(company=company_b, email="b@example.com")

    response = client.get("/api/contacts", params={"company_id": company_a["id"]}, headers=admin_headers)
    assert response.json()["total"] == 1


def test_contact_detail_includes_related_data(
    client, admin_headers, company_factory, contact_factory, lead_factory
):
    company = company_factory()
    contact = contact_factory(company=company)
    lead = lead_factory(company=company, contact=contact)

    client.post(
        "/api/activities",
        json={"lead_id": lead["id"], "type": "call", "subject": "Kickoff call"},
        headers=admin_headers,
    )
    client.post(
        "/api/tasks", json={"title": "Prep proposal", "related_contact_id": contact["id"]},
        headers=admin_headers,
    )

    response = client.get(f"/api/contacts/{contact['id']}", headers=admin_headers)
    body = response.json()
    assert body["leads"][0]["id"] == lead["id"]
    assert body["activities"][0]["subject"] == "Kickoff call"
    assert body["tasks"][0]["title"] == "Prep proposal"
