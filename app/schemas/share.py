from datetime import datetime

from pydantic import BaseModel, Field


class ShareLinkCreate(BaseModel):
    expires_hours: int | None = Field(default=None, ge=1)


class ShareLinkResponse(BaseModel):
    id: int
    note_id: int
    token: str
    is_active: bool
    created_at: datetime
    expires_at: datetime | None = None

    model_config = {"from_attributes": True}


class SharedNoteResponse(BaseModel):
    id: int
    title: str
    content: str
    rendered_html: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}