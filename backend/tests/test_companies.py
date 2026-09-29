def test_create_and_get_company(client, admin_headers, company_factory):
    company = company_factory(name="Acme Corp", website="https://acme.example.com")

    response = client.get(f"/api/companies/{company['id']}", headers=admin_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Acme Corp"
    assert body["website"] == "https://acme.example.com"
    assert body["archived"] is False
    assert body["created_at"]


def test_create_company_requires_auth(client):
    assert client.post("/api/companies", json={"name": "Nope"}).status_code == 401


def test_create_company_validation_error(client, admin_headers):
    response = client.post("/api/companies", json={"website": "https://x.example.com"}, headers=admin_headers)
    assert response.status_code == 422


def test_create_company_duplicate_name_case_insensitive(client, admin_headers, company_factory):
    company_factory(name="Acme Corp")
    response = client.post("/api/companies", json={"name": "  acme corp  "}, headers=admin_headers)
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_update_company(client, admin_headers, company_factory):
    company = company_factory()
    response = client.patch(
        f"/api/companies/{company['id']}",
        json={"industry": "Consulting", "phone": "+1-555-0100"},
        headers=admin_headers,
    )
    assert response.status_code == 200
    assert response.json()["industry"] == "Consulting"
    assert response.json()["phone"] == "+1-555-0100"
    assert response.json()["name"] == company["name"]  # untouched fields stay intact


def test_update_company_unknown_id(client, admin_headers):
    assert (
        client.patch("/api/companies/unknown-id", json={"name": "X"}, headers=admin_headers).status_code
        == 404
    )


def test_archive_and_unarchive(client, admin_headers, company_factory):
    company = company_factory()

    response = client.post(f"/api/companies/{company['id']}/archive", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["archived"] is True

    response = client.post(f"/api/companies/{company['id']}/archive", headers=admin_headers)
    assert response.status_code == 409

    response = client.post(f"/api/companies/{company['id']}/unarchive", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["archived"] is False


def test_archived_companies_excluded_from_list(client, admin_headers, company_factory):
    keep = company_factory(name="Keep Co")
    archive = company_factory(name="Archive Co")
    client.post(f"/api/companies/{archive['id']}/archive", headers=admin_headers)

    response = client.get("/api/companies", headers=admin_headers)
    names = [item["name"] for item in response.json()["items"]]
    assert names == ["Keep Co"]
    assert keep["id"]


def test_company_search(client, admin_headers, company_factory):
    company_factory(name="Globex Industries")
    company_factory(name="Initech", email="hello@initech.example.com")

    response = client.get("/api/companies", params={"search": "globex"}, headers=admin_headers)
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["name"] == "Globex Industries"

    response = client.get("/api/companies", params={"search": "initech.example"}, headers=admin_headers)
    assert response.json()["total"] == 1


def test_company_filter_by_industry(client, admin_headers, company_factory):
    company_factory(name="A Corp", industry="Software")
    company_factory(name="B Corp", industry="Legal")

    response = client.get("/api/companies", params={"industry": "software"}, headers=admin_headers)
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["name"] == "A Corp"


def test_company_pagination_and_sorting(client, admin_headers):
    for i in range(25):
        client.post(
            "/api/companies", json={"name": f"Company {i:02d}"}, headers=admin_headers
        )

    response = client.get(
        "/api/companies", params={"page": 2, "page_size": 10, "sort_by": "name", "order": "asc"},
        headers=admin_headers,
    )
    body = response.json()
    assert body["total"] == 25
    assert len(body["items"]) == 10
    assert body["items"][0]["name"] == "Company 10"

    response = client.get(
        "/api/companies", params={"sort_by": "hacker_field"}, headers=admin_headers
    )
    assert response.status_code == 422


def test_company_detail_includes_contacts_and_leads(
    client, admin_headers, company_factory, contact_factory, lead_factory
):
    company = company_factory(name="Detail Co")
    contact = contact_factory(company=company)
    lead_factory(title="Detail deal", company=company, contact=contact)

    response = client.get(f"/api/companies/{company['id']}", headers=admin_headers)
    body = response.json()
    assert body["contacts"][0]["id"] == contact["id"]
    assert body["leads"][0]["title"] == "Detail deal"
