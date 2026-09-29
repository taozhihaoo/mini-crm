#!/bin/sh
# Backend container entrypoint: wait for the database, apply migrations,
# optionally seed demo data, then start the API server.
set -e

echo "Waiting for the database to become available..."
python - <<'PY'
import os
import time

import sqlalchemy

url = os.environ.get("DATABASE_URL", "")
for attempt in range(30):
    try:
        engine = sqlalchemy.create_engine(url, pool_pre_ping=True)
        with engine.connect():
            print("Database is available.")
            break
    except Exception as exc:  # noqa: BLE001
        print(f"  attempt {attempt + 1}: database not ready ({exc.__class__.__name__})")
        time.sleep(2)
else:
    print("Database did not become available in time.")
    raise SystemExit(1)
PY

echo "Applying database migrations..."
alembic upgrade head

if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
    echo "Seeding demo data (skipped automatically if data already exists)..."
    python -m app.seeds.demo_seed || true
fi

echo "Starting ClientFlow CRM API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
