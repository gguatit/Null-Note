from datetime import datetime

from pydantic import BaseModel, Field


class NoteCreate(BaseModel):
    title: str = Field(default="Untitled", max_length=200)
    content: str = ""
    is_public: bool = False


class NoteUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    content: str | None = None
    is_public: bool | None = None


class NoteResponse(BaseModel):
    id: int
    user_id: int
    title: str
    content: str
    rendered_html: str
    is_public: bool
    created_at: datetime
    updated_at: datetime | None

    model_config = {"from_attributes": True}
