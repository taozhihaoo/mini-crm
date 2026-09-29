"""Test configuration.

The suite runs against an isolated in-memory SQLite database by default.
Set TEST_DATABASE_URL (e.g. a PostgreSQL URL) to run the same suite on
PostgreSQL - the schema and queries are portable across both dialects.
"""

import os
import uuid

# Must be set before any app import: settings are read at import time.
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", "sqlite://")
os.environ["SEED_DEMO_DATA"] = "false"
os.environ["LLM_PROVIDER"] = "mock"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import engine, get_db
from app.main import app
from app.models import User, UserRole

TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture(autouse=True)
def clean_db(_schema):
    """Wipe all rows after each test so tests stay independent."""
    yield
    db = TestSession()
    try:
        with db.begin():
            for table in reversed(Base.metadata.sorted_tables):
                db.execute(table.delete())
    finally:
        db.close()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def make_user(
    email: str = "admin@example.com",
    password: str = "SuperSecret1",
    role: UserRole = UserRole.admin,
    full_name: str = "Test Admin",
    is_active: bool = True,
) -> User:
    db = TestSession()
    try:
        user = User(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            role=role,
            is_active=is_active,
        )
        db.add(user)
        db.commit()
        return user
    finally:
        db.close()


def login(client: TestClient, email: str, password: str) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def admin_user():
    return make_user(role=UserRole.admin)


@pytest.fixture
def member_user():
    return make_user(email="member@example.com", role=UserRole.member, full_name="Test Member")


@pytest.fixture
def admin_headers(client, admin_user):
    return login(client, "admin@example.com", "SuperSecret1")


@pytest.fixture
def member_headers(client, member_user):
    return login(client, "member@example.com", "SuperSecret1")


@pytest.fixture
def company_factory(client, admin_headers):
    def _create(name: str | None = None, **overrides) -> dict:
        suffix = uuid.uuid4().hex[:6]
        payload = {
            "name": name or f"Acme Corp {suffix}",
            "industry": "Software",
            "email": f"acme-{suffix}@example.com",
        }
        payload.update(overrides)
        response = client.post("/api/companies", json=payload, headers=admin_headers)
        assert response.status_code == 201, response.text
        return response.json()

    return _create


@pytest.fixture
def contact_factory(client, admin_headers, company_factory):
    def _create(company: dict | None = None, email: str | None = None, **overrides) -> dict:
        company = company or company_factory()
        suffix = uuid.uuid4().hex[:6]
        payload = {
            "company_id": company["id"],
            "first_name": "Jane",
            "last_name": "Doe",
            "email": email or f"jane-{suffix}@example.com",
        }
        payload.update(overrides)
        response = client.post("/api/contacts", json=payload, headers=admin_headers)
        assert response.status_code == 201, response.text
        return response.json()

    return _create


@pytest.fixture
def lead_factory(client, admin_headers, company_factory, contact_factory):
    def _create(title: str = "Website redesign", **overrides) -> dict:
        company = overrides.pop("company", None) or company_factory()
        contact = overrides.pop(
            "contact", None
        ) or contact_factory(company=company, email=f"lead-{title.lower().replace(' ', '')}@example.com")
        payload = {
            "company_id": company["id"],
            "contact_id": contact["id"],
            "title": title,
            "value": "15000.00",
        }
        payload.update(overrides)
        response = client.post("/api/leads", json=payload, headers=admin_headers)
        assert response.status_code == 201, response.text
        return response.json()

    return _create
