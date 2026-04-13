import secrets
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.dependencies.auth import get_current_user
from app.models.note import Note
from app.models.share import ShareLink
from app.models.user import User
from app.schemas.share import SharedNoteResponse, ShareLinkCreate, ShareLinkResponse
from app.services.markdown import render_markdown

router = APIRouter(tags=["share"])


@router.post("/notes/{note_id}/share", response_model=ShareLinkResponse, status_code=status.HTTP_201_CREATED)
def create_share_link(
    note_id: int,
    payload: ShareLinkCreate = ShareLinkCreate(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    token = secrets.token_urlsafe(32)
    expires_at = None
    if payload.expires_hours:
        expires_at = datetime.now(UTC) + timedelta(hours=payload.expires_hours)

    share_link = ShareLink(
        note_id=note_id,
        token=token,
        expires_at=expires_at,
    )
    db.add(share_link)
    db.commit()
    db.refresh(share_link)
    return share_link


@router.get("/notes/{note_id}/share", response_model=list[ShareLinkResponse])
def list_share_links(
    note_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    links = db.query(ShareLink).filter(ShareLink.note_id == note_id).order_by(ShareLink.created_at.desc()).all()
    return links


@router.delete("/notes/{note_id}/share/{share_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_share_link(
    note_id: int,
    share_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    link = db.query(ShareLink).filter(ShareLink.id == share_id, ShareLink.note_id == note_id).first()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share link not found")

    link.is_active = False
    db.commit()
    return None


@router.get("/share/{token}", response_model=SharedNoteResponse)
def get_shared_note(token: str, db: Session = Depends(get_db)):
    share_link = db.query(ShareLink).filter(ShareLink.token == token, ShareLink.is_active.is_(True)).first()
    if not share_link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share link not found or expired")

    if share_link.expires_at and share_link.expires_at < datetime.now(UTC):
        share_link.is_active = False
        db.commit()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share link has expired")

    note = db.query(Note).filter(Note.id == share_link.note_id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    return SharedNoteResponse(
        id=note.id,
        title=note.title,
        content=note.content,
        rendered_html=render_markdown(note.content),
        created_at=note.created_at,
        updated_at=note.updated_at,
    )