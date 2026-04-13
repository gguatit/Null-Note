from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.dependencies.auth import get_current_user, get_optional_current_user
from app.models.note import Note
from app.models.organization import Folder, Tag
from app.models.user import User
from app.models.version import NoteVersion
from app.schemas.note import NoteCreate, NoteFolderTagBrief, NoteListResponse, NoteListItem, NoteResponse, NoteUpdate
from app.services.markdown import render_markdown

router = APIRouter(prefix="/notes", tags=["notes"])


def _to_response(note: Note) -> NoteResponse:
    return NoteResponse(
        id=note.id,
        user_id=note.user_id,
        title=note.title,
        content=note.content,
        rendered_html=render_markdown(note.content),
        is_public=note.is_public,
        is_pinned=note.is_pinned,
        created_at=note.created_at,
        updated_at=note.updated_at,
        folders=[NoteFolderTagBrief(id=f.id, name=f.name) for f in note.folders],
        tags=[NoteFolderTagBrief(id=t.id, name=t.name) for t in note.tags],
    )


def _to_list_item(note: Note) -> NoteListItem:
    return NoteListItem(
        id=note.id,
        title=note.title,
        is_public=note.is_public,
        is_pinned=note.is_pinned,
        created_at=note.created_at,
        updated_at=note.updated_at,
        folders=[NoteFolderTagBrief(id=f.id, name=f.name) for f in note.folders],
        tags=[NoteFolderTagBrief(id=t.id, name=t.name) for t in note.tags],
    )


def _resolve_folders(db: Session, user_id: int, folder_ids: list[int]) -> list[Folder]:
    if not folder_ids:
        return []
    folders = db.query(Folder).filter(Folder.id.in_(folder_ids), Folder.user_id == user_id).all()
    found_ids = {f.id for f in folders}
    for fid in folder_ids:
        if fid not in found_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Folder {fid} not found")
    return folders


def _resolve_tags(db: Session, user_id: int, tag_ids: list[int]) -> list[Tag]:
    if not tag_ids:
        return []
    tags = db.query(Tag).filter(Tag.id.in_(tag_ids), Tag.user_id == user_id).all()
    found_ids = {t.id for t in tags}
    for tid in tag_ids:
        if tid not in found_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Tag {tid} not found")
    return tags


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(
    payload: NoteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    folders = _resolve_folders(db, user.id, payload.folder_ids)
    tags = _resolve_tags(db, user.id, payload.tag_ids)
    note = Note(
        user_id=user.id,
        title=payload.title,
        content=payload.content,
        is_public=payload.is_public,
        is_pinned=payload.is_pinned,
    )
    note.folders = folders
    note.tags = tags
    db.add(note)
    db.commit()
    db.refresh(note)
    return _to_response(note)


@router.get("/public", response_model=NoteListResponse)
def list_public_notes(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Note).filter(Note.is_public.is_(True))
    total = query.count()
    notes = query.order_by(Note.updated_at.desc()).offset(offset).limit(limit).all()
    return NoteListResponse(
        items=[_to_list_item(n) for n in notes],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/user", response_model=NoteListResponse)
def list_user_notes(
    q: str | None = Query(default=None, min_length=1),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Note).filter(Note.user_id == user.id)
    if q:
        keyword = f"%{q}%"
        query = query.filter((Note.title.ilike(keyword)) | (Note.content.ilike(keyword)))

    total = query.count()
    notes = query.order_by(Note.is_pinned.desc(), Note.updated_at.desc()).offset(offset).limit(limit).all()
    return NoteListResponse(
        items=[_to_list_item(n) for n in notes],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{note_id}", response_model=NoteResponse)
def get_note(
    note_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_current_user),
):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    if not note.is_public:
        if user is None or note.user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No permission to access this note")

    return _to_response(note)


@router.put("/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: int,
    payload: NoteUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    should_save_version = False
    if payload.title is not None and payload.title != note.title:
        should_save_version = True
    if payload.content is not None and payload.content != note.content:
        should_save_version = True

    if should_save_version and not payload.is_autosave:
        version = NoteVersion(note_id=note.id, title=note.title, content=note.content)
        db.add(version)

    if payload.title is not None:
        note.title = payload.title
    if payload.content is not None:
        note.content = payload.content
    if payload.is_public is not None:
        note.is_public = payload.is_public
    if payload.is_pinned is not None:
        note.is_pinned = payload.is_pinned
    if payload.folder_ids is not None:
        note.folders = _resolve_folders(db, user.id, payload.folder_ids)
    if payload.tag_ids is not None:
        note.tags = _resolve_tags(db, user.id, payload.tag_ids)

    db.add(note)
    db.commit()
    db.refresh(note)
    return _to_response(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    db.delete(note)
    db.commit()
    return None