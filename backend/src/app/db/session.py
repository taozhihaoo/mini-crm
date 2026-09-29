from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings


def _create_engine(database_url: str):
    if database_url.startswith("sqlite"):
        # StaticPool + shared connection so in-memory SQLite works across sessions (tests).
        from sqlalchemy.pool import StaticPool

        return create_engine(
            database_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    return create_engine(database_url, pool_pre_ping=True)


settings = get_settings()
engine = _create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db():
    """FastAPI dependency yielding a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
