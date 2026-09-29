from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str | None = None
    user_email: str | None = None
    action: str
    entity_type: str
    entity_id: str | None = None
    # ORM attribute is `meta`; expose it as "metadata" in the API.
    metadata: dict[str, Any] | None = Field(default=None, validation_alias="meta")
    created_at: datetime
