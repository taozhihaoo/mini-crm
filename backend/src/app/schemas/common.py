from pydantic import BaseModel

# bcrypt only accepts passwords up to 72 UTF-8 bytes (not characters).
BCRYPT_MAX_BYTES = 72


class Page[T: BaseModel](BaseModel):
    """Standard paginated response envelope."""

    items: list[T]
    total: int
    page: int
    page_size: int
