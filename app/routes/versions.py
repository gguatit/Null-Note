from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.dependencies.auth import get_current_user
from app.models.note import Note
from app.models.user import User
from app.models.version import NoteVersion
from app.schemas.version import NoteVersionResponse

router = APIRouter(prefix="/notes", tags=["versions"])


@router.get("/{note_id}/versions", response_model=list[NoteVersionResponse])
def list_versions(
    note_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    versions = (
        db.query(NoteVersion)
        .filter(NoteVersion.note_id == note_id)
        .order_by(NoteVersion.created_at.desc())
        .all()
    )
    return versions


@router.get("/{note_id}/versions/{version_id}", response_model=NoteVersionResponse)
def get_version(
    note_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    version = db.query(NoteVersion).filter(NoteVersion.id == version_id, NoteVersion.note_id == note_id).first()
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")

    return version


@router.post("/{note_id}/versions/{version_id}/restore", response_model=NoteVersionResponse)
def restore_version(
    note_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    version = db.query(NoteVersion).filter(NoteVersion.id == version_id, NoteVersion.note_id == note_id).first()
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")

    new_version = NoteVersion(note_id=note.id, title=note.title, content=note.content)
    db.add(new_version)

    note.title = version.title
    note.content = version.content
    db.commit()
    db.refresh(version)
    return version