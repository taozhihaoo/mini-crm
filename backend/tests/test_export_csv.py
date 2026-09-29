import csv
import io


def test_export_leads(client, admin_headers, company_factory, contact_factory, lead_factory):
    company = company_factory(name="Export Co")
    contact = contact_factory(company=company)
    lead_factory(title="Exported deal", company=company, contact=contact, value="12345.67")

    response = client.get("/api/export/leads", headers=admin_headers)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers["content-disposition"]
    assert "leads_" in response.headers["content-disposition"]

    lines = response.text.strip().splitlines()
    assert lines[0].startswith("id,title,company,contact,stage")
    assert "Exported deal" in lines[1]
    assert "Export Co" in lines[1]
    assert "12345.67" in lines[1]


def test_export_sanitizes_formula_injection(client, admin_headers):
    dangerous_names = [
        '=HYPERLINK("http://evil.example", "click")',
        "+CMD(\"calc\")",
        "@SUM(1+1)",
        "-2+3|cmd",
        "\ttab-prefixed",
    ]
    for name in dangerous_names:
        client.post("/api/companies", json={"name": name}, headers=admin_headers)

    response = client.get("/api/export/companies", headers=admin_headers)
    rows = list(csv.reader(io.StringIO(response.text)))[1:]
    for row in rows:
        name_cell = row[1]
        # OWASP mitigation: a leading apostrophe makes Excel treat the cell as
        # text, so it is never evaluated as a formula.
        assert name_cell.startswith("'"), f"unsanitized cell: {name_cell!r}"


def test_export_sanitizes_leads_value_column(client, admin_headers, company_factory, contact_factory, lead_factory):
    company = company_factory(name="Sanitize Co")
    contact = contact_factory(company=company)
    lead_factory(title="=SUM(A1)", company=company, contact=contact)

    response = client.get("/api/export/leads", headers=admin_headers)
    assert "'=SUM(A1)" in response.text


def test_export_companies_and_contacts_and_tasks(client, admin_headers, company_factory, contact_factory, lead_factory):
    company = company_factory(name="All Co")
    contact = contact_factory(company=company)
    lead_factory(company=company, contact=contact)
    client.post("/api/tasks", json={"title": "Export me"}, headers=admin_headers)

    for entity in ["companies", "contacts", "tasks"]:
        response = client.get(f"/api/export/{entity}", headers=admin_headers)
        assert response.status_code == 200
        assert response.text.strip().count("\n") >= 1


def test_export_unknown_entity(client, admin_headers):
    assert client.get("/api/export/secrets", headers=admin_headers).status_code == 404


def test_export_requires_auth(client):
    assert client.get("/api/export/leads").status_code == 401
