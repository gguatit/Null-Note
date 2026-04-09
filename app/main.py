from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.db import Base, engine
from app.routes.auth import router as auth_router
from app.routes.notes import router as notes_router
from app.routes.organization import router as organization_router

app = FastAPI(title=settings.app_name)
static_dir = Path(__file__).resolve().parent / "static"

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
def root_page():
    return RedirectResponse(url="/dashboard", status_code=307)


@app.get("/dashboard", include_in_schema=False)
def dashboard_page():
    return FileResponse(static_dir / "dashboard.html")


@app.get("/login", include_in_schema=False)
def login_page():
    return FileResponse(static_dir / "login.html")


@app.get("/register", include_in_schema=False)
def register_page():
    return FileResponse(static_dir / "register.html")


@app.get("/public", include_in_schema=False)
def public_page():
    return FileResponse(static_dir / "public.html")


app.include_router(auth_router)
app.include_router(notes_router)
app.include_router(organization_router)
app.mount("/", StaticFiles(directory="app/static", html=True), name="static")
