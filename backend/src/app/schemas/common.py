from pydantic import BaseModel


class Page[T: BaseModel](BaseModel):
    """Standard paginated response envelope."""

    items: list[T]
    total: int
    page: int
    page_size: int
