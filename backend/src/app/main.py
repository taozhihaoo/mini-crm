import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.api.router import api_router
from app.core.config import get_settings, validate_runtime_settings
from app.core.exceptions import AppError

logger = logging.getLogger("clientflow")


def _register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    def _validation_payload(exc: ValidationError | RequestValidationError) -> dict:
        """Both pydantic and FastAPI validation errors share one response shape.

        `detail` is a human-readable string (what the SPA shows); `errors` keeps
        the per-field details for API consumers. Without this, bad sort fields
        produced `{detail: "Validation error", errors: [...]}` while bad query
        params produced `{detail: [...]}` - two incompatible shapes for one 422.
        """
        errors = [
            {
                "msg": err.get("msg", "invalid"),
                "loc": [str(part) for part in err.get("loc", [])],
            }
            for err in exc.errors()
        ]
        first = errors[0]["msg"] if errors else "invalid request"
        return {"detail": f"Validation error: {first}", "errors": errors}

    @app.exception_handler(ValidationError)
    async def handle_validation_error(_: Request, exc: ValidationError) -> JSONResponse:
        # Covers validation raised inside dependency models (e.g. bad sort fields),
        # which FastAPI does not always convert to a 422 response.
        return JSONResponse(status_code=422, content=_validation_payload(exc))

    @app.exception_handler(RequestValidationError)
    async def handle_request_validation_error(
        _: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(status_code=422, content=_validation_payload(exc))

    @app.exception_handler(Exception)
    async def handle_unexpected_error(_: Request, exc: Exception) -> JSONResponse:
        # Never leak internals (stack traces, SQL, config) to clients.
        logger.exception("Unhandled error: %s", exc)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})


def create_app() -> FastAPI:
    settings = get_settings()
    # Fail fast on unsafe configuration (weak production secret, demo seed in production).
    validate_runtime_settings(settings)

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
