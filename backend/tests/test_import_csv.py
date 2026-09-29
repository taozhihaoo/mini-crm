import io


def csv_file(content: str, name: str = "companies.csv"):
    return {"file": (name, io.BytesIO(content.encode("utf-8")), "text/csv")}


COMPANIES_CSV = (
    "name,website,industry,email\n"
    "Import Co,https://import.example.com,Software,info@import.example.com\n"
    "Second Co,,Legal,\n"
    "Third Co,https://third.example.com,Consulting,hello@third.example.com\n"
)


def test_import_companies_happy_path(client, admin_headers):
    response = client.post(
        "/api/import/companies", files=csv_file(COMPANIES_CSV), headers=admin_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert body["imported"] == 3
    assert body["skipped"] == 0
    assert body["errors"] == 0

    response = client.get("/api/companies", params={"search": "Import Co"}, headers=admin_headers)
    assert response.json()["total"] == 1


def test_import_companies_is_idempotent(client, admin_headers):
    first = client.post("/api/import/companies", files=csv_file(COMPANIES_CSV), headers=admin_headers)
    assert first.json()["imported"] == 3

    # Re-importing the same file skips everything as duplicates.
    second = client.post("/api/import/companies", files=csv_file(COMPANIES_CSV), headers=admin_headers)
    assert second.json()["imported"] == 0
    assert second.json()["skipped"] == 3


def test_import_reports_row_errors_without_failing_file(client, admin_headers):
    content = (
        "name,industry\n"
        "Good Co,Software\n"
        ",Broken row\n"  # missing name -> row error
        "Another Good Co,Legal\n"
    )
    response = client.post("/api/import/companies", files=csv_file(content), headers=admin_headers)
    body = response.json()
    assert body["imported"] == 2
    assert body["errors"] == 1
    assert body["error_details"][0]["row"] == 3
    assert "name" in body["error_details"][0]["message"].lower() or body["error_details"][0]["field"] == "name"


def test_import_rejects_missing_required_columns(client, admin_headers):
    content = "website,industry\nhttps://x.example.com,Software\n"
    response = client.post(
        "/api/import/companies", files=csv_file(content), headers=admin_headers
    )
    assert response.status_code == 422
    assert "name" in response.json()["detail"]


def test_import_rejects_empty_file(client, admin_headers):
    response = client.post("/api/import/companies", files=csv_file(""), headers=admin_headers)
    assert response.status_code == 422


def test_import_rejects_non_csv_filename(client, admin_headers):
    response = client.post(
        "/api/import/companies", files=csv_file(COMPANIES_CSV, name="data.txt"), headers=admin_headers
    )
    assert response.status_code == 422


def test_contact_import_requires_known_company(client, admin_headers, company_factory):
    company_factory(name="Existing Co")

    content = (
        "first_name,last_name,email,company\n"
        "Ann,Lee,ann@existing.example.com,Existing Co\n"
        "Bob,Kim,bob@unknown.example.com,Unknown Co\n"
        "Ann,Lee,ann@existing.example.com,Existing Co\n"  # duplicate email -> skipped
    )
    response = client.post("/api/import/contacts", files=csv_file(content, name="contacts.csv"), headers=admin_headers)
    body = response.json()
    assert body["imported"] == 1
    assert body["skipped"] == 1
    assert body["errors"] == 1
    assert body["error_details"][0]["field"] == "company"
    assert "Unknown Co" in body["error_details"][0]["message"]

    response = client.get("/api/contacts", headers=admin_headers)
    assert response.json()["total"] == 1


def test_contact_import_invalid_email_row(client, admin_headers, company_factory):
    company_factory(name="Mail Co")
    content = (
        "first_name,last_name,email,company\n"
        "Bad,Row,not-an-email,Mail Co\n"
        "Good,Row,good@mail.example.com,Mail Co\n"
    )
    response = client.post("/api/import/contacts", files=csv_file(content, name="contacts.csv"), headers=admin_headers)
    body = response.json()
    assert body["imported"] == 1
    assert body["errors"] == 1
    assert body["error_details"][0]["row"] == 2


def test_import_requires_auth(client):
    assert client.post("/api/import/companies", files=csv_file(COMPANIES_CSV)).status_code == 401
