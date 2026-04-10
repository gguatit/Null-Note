from datetime import datetime

from pydantic import BaseModel


class NoteVersionResponse(BaseModel):
    id: int
    note_id: int
    title: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}