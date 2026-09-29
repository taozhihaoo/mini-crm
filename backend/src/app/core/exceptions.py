"""Domain-level errors. The API layer maps these to safe HTTP responses."""


class AppError(Exception):
    """Base class for expected application errors."""

    status_code = 400
    detail = "Bad request"

    def __init__(self, detail: str | None = None) -> None:
        if detail:
            self.detail = detail
        super().__init__(self.detail)


class NotFoundError(AppError):
    status_code = 404
    detail = "Resource not found"


class ConflictError(AppError):
    status_code = 409
    detail = "Resource already exists"


class BusinessRuleError(AppError):
    status_code = 422
    detail = "Business rule violated"


class InvalidCredentialsError(AppError):
    status_code = 401
    detail = "Invalid email or password"


class UnauthorizedError(AppError):
    status_code = 401
    detail = "Not authenticated"


class ForbiddenError(AppError):
    status_code = 403
    detail = "Not allowed"


class AIProviderError(AppError):
    status_code = 502
    detail = "AI provider request failed"
