from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.dependencies.auth import get_current_user
from app.models.organization import Folder, Tag
from app.models.user import User
from app.schemas.organization import NamedItemCreate, NamedItemResponse

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
    db.commit()
    db.refresh(folder)
    return folder


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
    db.commit()
    db.refresh(tag)
    return tag
