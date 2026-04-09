from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.dependencies.auth import get_current_user, get_optional_current_user
from app.models.note import Note
from app.models.user import User
from app.schemas.note import NoteCreate, NoteResponse, NoteUpdate
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
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(
    payload: NoteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    note = Note(user_id=user.id, title=payload.title, content=payload.content, is_public=payload.is_public)
    db.add(note)
    db.commit()
    db.refresh(note)
    return _to_response(note)


@router.get("/public", response_model=list[NoteResponse])
def list_public_notes(limit: int = Query(default=50, ge=1, le=100), db: Session = Depends(get_db)):
    notes = (
        db.query(Note)
        .filter(Note.is_public.is_(True))
        .order_by(Note.updated_at.desc())
        .limit(limit)
        .all()
    )
    return [_to_response(note) for note in notes]


@router.get("/user", response_model=list[NoteResponse])
def list_user_notes(
    q: str | None = Query(default=None, min_length=1),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Note).filter(Note.user_id == user.id)
    if q:
        keyword = f"%{q}%"
        query = query.filter((Note.title.ilike(keyword)) | (Note.content.ilike(keyword)))

    notes = query.order_by(Note.updated_at.desc()).all()
    return [_to_response(note) for note in notes]


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

    if payload.title is not None:
        note.title = payload.title
    if payload.content is not None:
        note.content = payload.content
    if payload.is_public is not None:
        note.is_public = payload.is_public

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
