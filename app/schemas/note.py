from datetime import datetime

from pydantic import BaseModel, Field


class NoteCreate(BaseModel):
    title: str = Field(default="Untitled", max_length=200)
    content: str = ""
    is_public: bool = False
    is_pinned: bool = False
    folder_ids: list[int] = Field(default_factory=list)
    tag_ids: list[int] = Field(default_factory=list)


class NoteUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    content: str | None = None
    is_public: bool | None = None
    is_pinned: bool | None = None
    folder_ids: list[int] | None = None
    tag_ids: list[int] | None = None


class NoteResponse(BaseModel):
    id: int
    user_id: int
    title: str
    content: str
    rendered_html: str
    is_public: bool
    is_pinned: bool
    created_at: datetime
    updated_at: datetime | None
    folders: list["NoteFolderTagBrief"] = []
    tags: list["NoteFolderTagBrief"] = []

    model_config = {"from_attributes": True}


class NoteFolderTagBrief(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class NoteListItem(BaseModel):
    id: int
    title: str
    is_public: bool
    is_pinned: bool
    created_at: datetime
    updated_at: datetime | None
    folders: list[NoteFolderTagBrief] = []
    tags: list[NoteFolderTagBrief] = []

    model_config = {"from_attributes": True}


class NoteListResponse(BaseModel):
    items: list[NoteListItem]
    total: int
    limit: int
    offset: int