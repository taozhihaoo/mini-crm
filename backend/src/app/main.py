import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.api.router import api_router
from app.core.config import get_settings
from app.core.exceptions import AppError

logger = logging.getLogger("clientflow")


def _register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    @app.exception_handler(ValidationError)
    async def handle_validation_error(_: Request, exc: ValidationError) -> JSONResponse:
        # Covers validation raised inside dependency models (e.g. bad sort fields),
        # which FastAPI does not always convert to a 422 response.
        return JSONResponse(
            status_code=422,
            content={
                "detail": "Validation error",
                "errors": [{"msg": err.get("msg", "invalid")} for err in exc.errors()],
            },
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(_: Request, exc: Exception) -> JSONResponse:
        # Never leak internals (stack traces, SQL, config) to clients.
        logger.exception("Unhandled error: %s", exc)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})


def create_app() -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        if settings.seed_demo_data:
            from app.db.session import SessionLocal
            from app.seeds.demo_seed import seed_demo_data

            db = SessionLocal()
            try:
                seed_demo_data(db)
            finally:
                db.close()
        yield

    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        description="Small Business CRM with AI-assisted sales workflows",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    _register_exception_handlers(app)
    app.include_router(api_router, prefix="/api")
    return app


app = create_app()
