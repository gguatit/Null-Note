from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class ShareLink(Base):
    __tablename__ = "share_links"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    note_id: Mapped[int] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), index=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    note = relationship("Note", back_populates="share_links")