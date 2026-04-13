import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.core.config import settings
from app.dependencies.auth import get_current_user
from app.models.user import User

router = APIRouter(tags=["images"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}
MAX_SIZE = 10 * 1024 * 1024


@router.post("/images", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile,
    user: User = Depends(get_current_user),
):
    if not file.content_type or file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image type")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image too large (max 10MB)")

    ext = Path(file.filename or "image.png").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        ext = ".png"
    filename = f"{secrets.token_urlsafe(16)}{ext}"
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / filename
    file_path.write_bytes(content)

    return {"url": f"/uploads/{filename}", "filename": filename}


@router.get("/uploads/{filename}")
def serve_upload(filename: str):
    file_path = Path(settings.upload_dir) / filename
    if not file_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    return FileResponse(file_path)