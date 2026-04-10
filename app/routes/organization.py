from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.dependencies.auth import get_current_user
from app.models.note import Note
from app.models.organization import Folder, Tag
from app.models.user import User
from app.schemas.organization import NamedItemCreate, NamedItemResponse, NamedItemUpdate, NoteAssignRequest

router = APIRouter(tags=["organization"])


@router.get("/folders", response_model=list[NamedItemResponse])
def list_folders(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Folder).filter(Folder.user_id == user.id).order_by(Folder.id.desc()).all()


@router.post("/folders", response_model=NamedItemResponse, status_code=status.HTTP_201_CREATED)
def create_folder(
    payload: NamedItemCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = db.query(Folder).filter(Folder.user_id == user.id, Folder.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Folder name already exists")

    folder = Folder(user_id=user.id, name=payload.name)
    db.add(folder)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Folder name already exists")
    db.refresh(folder)
    return folder


@router.put("/folders/{folder_id}", response_model=NamedItemResponse)
def update_folder(
    folder_id: int,
    payload: NamedItemUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    folder = db.query(Folder).filter(Folder.id == folder_id, Folder.user_id == user.id).first()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    if payload.name is not None:
        existing = db.query(Folder).filter(Folder.user_id == user.id, Folder.name == payload.name, Folder.id != folder_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Folder name already exists")
        folder.name = payload.name

    db.commit()
    db.refresh(folder)
    return folder


@router.delete("/folders/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    folder = db.query(Folder).filter(Folder.id == folder_id, Folder.user_id == user.id).first()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    db.delete(folder)
    db.commit()
    return None


@router.post("/folders/{folder_id}/notes", status_code=status.HTTP_204_NO_CONTENT)
def add_note_to_folder(
    folder_id: int,
    payload: NoteAssignRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    folder = db.query(Folder).filter(Folder.id == folder_id, Folder.user_id == user.id).first()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    note = db.query(Note).filter(Note.id == payload.note_id, Note.user_id == user.id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    if folder not in note.folders:
        note.folders.append(folder)
        db.commit()
    return None


@router.delete("/folders/{folder_id}/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_note_from_folder(
    folder_id: int,
    note_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    folder = db.query(Folder).filter(Folder.id == folder_id, Folder.user_id == user.id).first()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    if folder in note.folders:
        note.folders.remove(folder)
        db.commit()
    return None


@router.get("/tags", response_model=list[NamedItemResponse])
def list_tags(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Tag).filter(Tag.user_id == user.id).order_by(Tag.id.desc()).all()


@router.post("/tags", response_model=NamedItemResponse, status_code=status.HTTP_201_CREATED)
def create_tag(
    payload: NamedItemCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = db.query(Tag).filter(Tag.user_id == user.id, Tag.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tag name already exists")

    tag = Tag(user_id=user.id, name=payload.name)
    db.add(tag)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tag name already exists")
    db.refresh(tag)
    return tag


@router.put("/tags/{tag_id}", response_model=NamedItemResponse)
def update_tag(
    tag_id: int,
    payload: NamedItemUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == user.id).first()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")

    if payload.name is not None:
        existing = db.query(Tag).filter(Tag.user_id == user.id, Tag.name == payload.name, Tag.id != tag_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tag name already exists")
        tag.name = payload.name

    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == user.id).first()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")

    db.delete(tag)
    db.commit()
    return None


@router.post("/tags/{tag_id}/notes", status_code=status.HTTP_204_NO_CONTENT)
def add_note_to_tag(
    tag_id: int,
    payload: NoteAssignRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == user.id).first()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")

    note = db.query(Note).filter(Note.id == payload.note_id, Note.user_id == user.id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    if tag not in note.tags:
        note.tags.append(tag)
        db.commit()
    return None


@router.delete("/tags/{tag_id}/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_note_from_tag(
    tag_id: int,
    note_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == user.id).first()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")

    note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    if tag in note.tags:
        note.tags.remove(tag)
        db.commit()
    return None