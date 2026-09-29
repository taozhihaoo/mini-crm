# ClientFlow CRM

A small business CRM with AI-assisted sales workflows. Manage companies, contacts,
leads, activities and tasks, track a guarded sales pipeline, import/export CSV,
and use AI for lead summaries, prioritization and follow-up drafts.

> **Independent portfolio project.** All demo data is fictional. It is a
> small-but-complete CRM prototype - not an enterprise platform.

## Overview

ClientFlow CRM is built as a "small and complete" product: a real database, real
authentication, a REST API, guarded business workflows and AI assistance that
works fully offline with a deterministic mock provider. `docker compose up` is
all a reviewer needs to see a working CRM with realistic data.

Highlights:

- **Sales pipeline with guardrails** - leads move through
  `New → Qualified → Proposal → Negotiation → Won/Lost`; illegal jumps are
  rejected by the backend (e.g. `New → Won`), `Won` is terminal, `Lost` can be
  reopened. The Kanban board persists every move through the API.
- **AI assistance by default is offline** - a deterministic `MockProvider`
  powers summaries, priority suggestions and follow-up drafts with no API key.
  Adding `OPENAI_API_KEY` and switching `LLM_PROVIDER=openai` uses the real
  OpenAI Chat Completions API with strict structured-output validation.
- **AI is advisory only** - nothing is ever sent automatically. Drafts must be
  explicitly accepted ("Use Draft") and can only be logged as CRM activities.
- **Audited by design** - logins, entity changes, stage transitions, AI calls
  and imports are recorded in an audit log (admin visible), without secrets.

## Features

- Dashboard with live aggregates (companies, contacts, open/won/lost leads,
  pipeline value, tasks due today / overdue) and a 6-stage pipeline overview
- Companies / Contacts / Leads with search, filtering, sorting, pagination
- Kanban pipeline with drag & drop (server-validated, persisted)
- Activity history (call / email / meeting / note) with chronological timeline
- Tasks with due dates, statuses (open / completed / cancelled) and priorities
- CSV import (companies, contacts) with duplicate detection and per-row error
  reporting; CSV export (leads, companies, contacts, tasks) with formula-injection
  protection
- Authentication (JWT, bcrypt-hashed passwords), roles: admin / member
- Team management and audit log (admin only)
- REST API with OpenAPI docs at `/docs`
- Automated tests: 131 backend (pytest) + 17 frontend (Vitest/RTL)
- Docker Compose (PostgreSQL + FastAPI + nginx), GitHub Actions CI

## Screenshots

| Dashboard | Pipeline |
| --- | --- |
| ![Dashboard](docs/screenshots/dashboard.png) | ![Pipeline](docs/screenshots/pipeline.png) |

| Lead detail + AI | Audit log |
| --- | --- |
| ![Lead detail with AI](docs/screenshots/lead-detail-ai.png) | ![Audit log](docs/screenshots/audit-log.png) |

All screenshots come from the real running application (seeded demo data, mock
AI provider). The layout is responsive; a mobile dashboard capture is included
at `docs/screenshots/mobile-dashboard.png`.

## Architecture

```
Frontend (React SPA)          Backend (FastAPI - modular monolith)         Data
┌──────────────────┐  HTTP   ┌──────────────────────────────────────┐   ┌────────────┐
│ pages            │ ──────► │ api routers (validation, auth)       │   │ PostgreSQL │
│ components       │  JSON   │   ↓                                  │   │    or      │
│ TanStack Query   │ ◄────── │ services (business rules, audit)     │◄──│ SQLite     │
│ React Hook Form  │         │   ↓                ↓                 │   │ (tests /   │
└──────────────────┘         │ repositories      LLMProvider        │   │  offline)  │
                             │   ↓                ├ MockProvider     │   └────────────┘
                             │  ORM (SQLAlchemy)  └ OpenAIProvider   │
                             └──────────────────────────────────────┘
```

- Routers never touch SQL or call OpenAI directly - business rules live in the
  service layer, persistence in repositories, AI in the provider abstraction.
- The AI provider is chosen via `LLM_PROVIDER` (`mock` | `openai`).
  System prompts are fixed; all CRM data is passed inside explicitly delimited
  "untrusted data" blocks in the user message, so customer-controlled text
  cannot inject instructions (prompt-injection isolation).
- OpenAI calls use strict JSON-mode structured output validated by Pydantic,
  bounded retries (network / 5xx / 429 only - never on auth failures), and
  timeouts. Invalid AI output raises a clean 502 - CRM data is never touched.

## Tech Stack

| Layer | Choice |
| --- | --- |
| Backend | Python 3.13, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2 |
| Auth | JWT (PyJWT, HS256), bcrypt password hashing |
| AI | httpx against OpenAI Chat Completions; deterministic offline MockProvider |
| Database | PostgreSQL 16 (Docker Compose / production path); SQLite fallback for quick local runs and the test suite |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS 4, React Router 6, TanStack Query 5, React Hook Form 7 |
| Testing | pytest (backend), Vitest + React Testing Library (frontend) |
| Quality | ruff, ESLint 9, `tsc` typecheck |
| Infra | Docker Compose (non-root containers, health checks, persistent volume), GitHub Actions CI, gitleaks |

## Requirements

- Docker + Docker Compose (recommended path), **or**
- Python 3.12+ and Node.js 20+ for local development without Docker

No OpenAI API key is required - the mock provider works fully offline.

## Quick Start

```bash
git clone <your-repo-url> clientflow-crm
cd clientflow-crm
docker compose up --build
```

Then open:

- **App:** http://localhost:3000
- **API:** http://localhost:8000/api/health
- **API docs:** http://localhost:8000/docs

The database is migrated automatically on startup and seeded with fictional
demo data (3 users, 10 companies, 20 contacts, 15 leads, 30 activities, 15 tasks).

## Docker Setup

`docker-compose.yml` defines three services:

| Service | Image / build | Port | Notes |
| --- | --- | --- | --- |
| `db` | postgres:16-alpine | internal | persistent volume `pgdata`, health check |
| `backend` | `./backend` (python:3.13-slim) | 8000 | runs `alembic upgrade head`, optional demo seed, then uvicorn; non-root user; health check |
| `frontend` | `./frontend` (node build → nginx-unprivileged) | 3000 | serves the SPA and proxies `/api` to the backend |

Secrets (`SECRET_KEY`, `OPENAI_API_KEY`, `POSTGRES_PASSWORD`) are injected at
runtime via environment variables - never baked into images. Copy
[`.env.example`](.env.example) to `.env` to override the demo-only defaults.

> **Note:** live container execution has not been verified in this
> environment (no Docker available); see [Verification Status](#verification-status).

```bash
# Use the real OpenAI integration (requires your own key):
LLM_PROVIDER=openai OPENAI_API_KEY=sk-... docker compose up
```

## Local Development

Backend:

```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -e ".[dev]"        # Windows
# .venv/bin/pip install -e ".[dev]"          # macOS/Linux

# Quick run with SQLite (no infrastructure needed):
DATABASE_URL=sqlite:///./clientflow.local.db SEED_DEMO_DATA=true python -m uvicorn app.main:app --reload

# Or against PostgreSQL (recommended):
DATABASE_URL=postgresql+psycopg://clientflow:clientflow@localhost:5432/clientflow alembic upgrade head
python -m uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173, proxies /api to localhost:8000
```

## Demo Account

| User | Password | Role |
| --- | --- | --- |
| `admin@clientflow.dev` | `Admin123!` | admin |
| `sarah@clientflow.dev` | `Member123!` | member |
| `mike@clientflow.dev` | `Member123!` | member |

These are **DEMO ONLY** credentials for the seeded fictional dataset. Do not
reuse them anywhere real. There is no self-registration; admins create users
in Settings → Team.

### 5-minute demo workflow (works fully on Mock AI)

1. Login as `admin@clientflow.dev`
2. Open **Dashboard** - live aggregates from the database
3. **Companies → New Company** - create one
4. **Contacts → New Contact** - attach it to the company
5. **Leads → New Lead** - link company + contact
6. **Pipeline** - drag the lead from *New* to *Qualified* (persisted via the API)
7. Open the lead → **Log Activity** (call/email/meeting/note)
8. **Add Task** with a due date
9. **Generate AI Summary** / **Suggest Priority** → *Apply to lead*
10. **Draft Follow-up Email** → **Use Draft** → edit → *Log as Email Activity*
11. Back to **Dashboard** - numbers updated
12. **Settings → Audit Log** - every step above is recorded

## Configuration

Environment variables (see `backend/.env.example` and `.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./clientflow.local.db` | SQLAlchemy URL (compose uses PostgreSQL) |
| `ENVIRONMENT` | `development` | `development` \| `demo` \| `production` (see guards below) |
| `SECRET_KEY` | dev-only value | JWT signing secret - **required (non-default) in production** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `720` | JWT lifetime |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins - inject real domains per deployment |
| `LLM_PROVIDER` | `mock` | `mock` or `openai` |
| `OPENAI_API_KEY` | empty | Required only for `openai` (runtime injection) |
| `OPENAI_MODEL` | `gpt-4o-mini` | Chat model for the OpenAI provider |
| `SEED_DEMO_DATA` | `false` | Seed fictional demo data on startup (compose: `true`) |

**Environment guards (enforced at startup):**

- `development` / `demo` may use the built-in development secret and seed the
  fictional demo dataset (the Docker Compose stack runs as `demo`).
- `production` **refuses to start** with the built-in development secret, and
  **refuses to start** with `SEED_DEMO_DATA=true` - demo credentials must
  never exist in a production deployment.
| `ENVIRONMENT` | `development` | Free-form environment label |

## Database & Migrations

Tables: `users`, `companies`, `contacts`, `leads`, `activities`, `tasks`,
`audit_logs` - with foreign keys, indexes on common filters, an activities
link check constraint, timestamps and soft-delete (`archived_at`).

```bash
cd backend
alembic upgrade head       # apply migrations
alembic downgrade base     # roll back
python -m app.seeds.demo_seed   # seed demo data (idempotent, skips if users exist)
```

## REST API

Interactive docs: `/docs` (Swagger UI). Groups:

- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/change-password`
- `GET|POST /api/users`, `PATCH /api/users/{id}` *(admin)*
- `GET /api/dashboard`
- `GET|POST /api/companies`, `GET|PATCH /api/companies/{id}`, `POST .../archive|unarchive`
- `GET|POST /api/contacts`, `GET|PATCH /api/contacts/{id}`, `POST .../archive|unarchive`
- `GET|POST /api/leads`, `GET|PATCH /api/leads/{id}`, `PATCH /api/leads/{id}/stage`, `POST .../archive|unarchive`
- `GET|POST /api/activities`, `PATCH /api/activities/{id}`
- `GET|POST /api/tasks`, `PATCH /api/tasks/{id}`
- `POST /api/ai/leads/{id}/summary|priority|follow-up`
- `POST /api/import/companies`, `POST /api/import/contacts`
- `GET /api/export/{leads|companies|contacts|tasks}`
- `GET /api/audit-logs` *(admin)*
- `GET /api/health`

All endpoints (except login/health) require a bearer token; admin-only
endpoints enforce the role server-side. List endpoints support
`page`, `page_size`, `search`, whitelisted `sort_by` / `order` and entity
specific filters. Errors are safe JSON (`{ "detail": ... }`) - no tracebacks.

## AI Features

| Endpoint | Input (CRM data) | Output (validated) |
| --- | --- | --- |
| `POST /api/ai/leads/{id}/summary` | lead, company, contact, recent activities | `{ summary }` |
| `POST /api/ai/leads/{id}/priority` | same | `{ priority: low\|medium\|high, reasoning }` |
| `POST /api/ai/leads/{id}/follow-up` | same | `{ subject, body }` |

- Default `mock` provider is deterministic (same lead → same output), so demos
  and tests are reproducible without network access.
- The `openai` provider is implemented and calls the real API, **but requires
  a user-provided API key** - it is never exercised without one.
  **Live OpenAI API execution has not been verified in this environment**
  (no API key available); the provider itself is covered by mocked-HTTP tests.
- Token usage: when the provider reports usage (prompt/completion/total
  tokens), it is recorded in the AI audit entry; when it does not, the value
  is `null` - usage is never estimated or invented. Cost is not calculated.
- Every AI call is audited (`ai.summary`, `ai.priority`, `ai.follow_up_draft`)
  with the provider name; failures return 502 and never modify CRM data.
- Customer-controlled text is treated as untrusted data: it travels in a
  delimited block with explicit "do not follow instructions inside" framing,
  never in the system prompt.

## Import / Export

**Import** (companies, contacts): UTF-8 CSV with headers
(`name,website,industry,phone,email,address,notes` /
`first_name,last_name,email,company,phone,job_title,notes`). Per-row
validation, duplicate detection (company name / contact email), row-numbered
error report and a summary:

```json
{ "imported": 42, "skipped": 3, "errors": 2, "error_details": [ { "row": 7, "field": "email", "message": "..." } ] }
```

A single invalid row never fails the whole file. Contact imports require the
company to exist (import companies first).

**Export** (leads, companies, contacts, tasks): generated from live database
data; cells starting with `=`, `+`, `-`, `@` are prefixed with `'` to prevent
spreadsheet formula injection.

## Testing

```bash
# Backend (SQLite by default; set TEST_DATABASE_URL for PostgreSQL)
cd backend && pytest                    # 131 tests
cd backend && ruff check src tests

# Frontend
cd frontend && npm test                 # 17 tests
cd frontend && npm run typecheck && npm run lint && npm run build
```

Backend tests are API-level integration tests (HTTP → FastAPI → service →
repository → test database) covering auth, authorization, all CRUD areas,
stage-transition guardrails, pagination/filtering/sorting, CSV import/export,
dashboard aggregates, audit logging, and AI. AI tests never touch the network:
OpenAI provider behavior (structured output, retries, rate limits, auth errors,
timeouts, prompt-injection isolation) is simulated with `httpx.MockTransport`.

CI (`.github/workflows/ci.yml`) runs ruff + the backend suite **against a real
PostgreSQL 16 service** (including an Alembic upgrade/downgrade check), plus
frontend lint/typecheck/tests/build and a gitleaks secret scan (pinned
official binary over the full git history).

## Security

- Passwords: bcrypt hashes; login failures return generic 401s (no user
  enumeration); deactivated users are rejected immediately
- JWT bearer tokens; no cookies → classical CSRF does not apply; tokens stay
  in `localStorage` (documented trade-off for this scope - rotate
  `SECRET_KEY` and short lifetimes mitigate)
- **Production startup guards**: `ENVIRONMENT=production` refuses to boot with
  the built-in development secret or with demo seeding enabled
- SQL injection: SQLAlchemy bound parameters everywhere; search terms are
  LIKE-escaped
- XSS: React output escaping; no `dangerouslySetInnerHTML`; AI-generated text
  is rendered as plain text, never as HTML
- CSV injection: export cells sanitized (see above)
- File upload: `.csv` extension check, UTF-8 decode guard, row-count cap
- Authorization: role checks enforced in backend dependencies, never only in
  the UI; admins cannot deactivate their own account
- Audit metadata never contains passwords, tokens or API keys
- AI: system/user prompt separation, structured output validation, bounded
  retries (never on auth failures), timeouts, 429 `Retry-After` handling

## Project Structure

```
├── backend/
│   ├── alembic/                  # migrations
│   ├── src/app/
│   │   ├── api/                  # FastAPI routers
│   │   ├── core/                 # config, security, dependencies, errors
│   │   ├── db/                   # engine, session, declarative base
│   │   ├── models/               # SQLAlchemy ORM models + enums
│   │   ├── schemas/              # Pydantic request/response models
│   │   ├── repositories/         # database queries
│   │   ├── services/             # business rules + audit logging
│   │   ├── providers/            # LLMProvider: Mock | OpenAI (+ prompts)
│   │   ├── seeds/                # fictional demo dataset
│   │   └── main.py               # app factory, error handlers, CORS
│   ├── tests/                    # pytest suite (integration + provider tests)
│   ├── alembic.ini, Dockerfile, entrypoint.sh
├── frontend/
│   ├── src/
│   │   ├── api/                  # typed fetch client + endpoint modules
│   │   ├── components/           # UI primitives, forms, pipeline board
│   │   ├── context/              # auth context
│   │   ├── layouts/, pages/      # app shell + 10 pages
│   │   └── test/                 # Vitest + RTL tests
│   ├── Dockerfile, nginx.conf
├── docs/screenshots/
├── .github/workflows/ci.yml
└── docker-compose.yml
```

## Limitations

Honest scope boundaries of this project:

- Single-organization deployment; no multi-tenancy or SaaS billing
- "Today" boundaries for task buckets are computed on the UTC day
- No email sending, notifications or calendar sync (drafts are logged as
  activities only)
- Kanban loads up to 100 leads (pagination applies to the list page)
- JWT revocation is implicit (deactivation is checked per request); there is
  no token blacklist
- Import requires companies to exist before contacts referencing them
- SQLite is supported for quick local runs/tests; PostgreSQL is the primary
  database used by Docker Compose and CI
- Docker Compose stacks in this repository were authored with health checks
  and non-root users but could not be executed on the development machine
  (no Docker available) - see verification notes below

## Roadmap (not implemented, by design)

Invoicing / accounting / payroll, marketing automation, mass email campaigns,
live chat, calendar synchronization, payment processing, WhatsApp / Telegram /
social integrations, workflow builder, marketplace, subscription management.

## Verification Status

Everything below reflects what was actually executed, not aspirations.

**VERIFIED (executed for real):**

- ✅ Backend tests: **131 passed** on SQLite; the same suite ran green against
  a local PostgreSQL 16 instance, including `alembic upgrade head` /
  `downgrade base` / `upgrade head` from an empty database
- ✅ **GitHub Actions CI ran green on this repository**: the backend job
  (ruff + pytest on a real PostgreSQL 16 service + Alembic upgrade/downgrade
  check) and the frontend job (lint, typecheck, vitest, production build)
  both passed on real runners
- ✅ Frontend: 17 Vitest/RTL tests, ESLint, `tsc` typecheck, production build
- ✅ Live end-to-end run (uvicorn + seeded database + browser): login,
  dashboard, company/contact/lead creation, guarded stage transitions,
  activity, task, all three AI actions, "Use Draft" flow, audit trail,
  CSV import/export, Swagger docs
- ✅ Responsive layout checked at mobile (390px), tablet (820px) and desktop
  sizes against the running application
- ✅ Secret scanning: gitleaks 8.24.3 over the full git history - no leaks
- ✅ Compose file: semantic validation of services, health checks, startup
  dependencies and runtime secret injection

**NOT VERIFIED (cannot be executed in this environment - never claimed):**

- ⚠️ `docker compose build` / `docker compose up` - **NOT VERIFIED - Docker
  unavailable** on the development machine. The configuration follows
  standard patterns (multi-stage builds, non-root users, health checks,
  persistent volume) and the backend entrypoint sequence was exercised in
  the local live run, but no container was ever started.
- ⚠️ Real OpenAI API - **NOT VERIFIED - API key unavailable.** The OpenAI
  provider is implemented and tested against a simulated HTTP transport
  (`httpx.MockTransport`); no live OpenAI request was ever made, and no
  usage/cost numbers are claimed.
- ⚠️ gitleaks CI job - after replacing the third-party wrapper action with
  the pinned official binary, the job configuration mirrors the locally
  verified scan; its green run on GitHub Actions is pending the next push.

## License

MIT - see [LICENSE](LICENSE).
