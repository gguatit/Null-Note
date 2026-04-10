from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import settings
from app.core.db import Base, engine
from app.routes.auth import router as auth_router
from app.routes.notes import router as notes_router
from app.routes.organization import router as organization_router
from app.routes.versions import router as versions_router

limiter = Limiter(key_func=get_remote_address)

CANONICAL_HTML_ROUTES = {
    "/index.html": "/dashboard",
    "/dashboard.html": "/dashboard",
    "/login.html": "/login",
    "/register.html": "/register",
    "/public.html": "/public",
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.check_production_safety()
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
static_dir = Path(__file__).resolve().parent / "static"

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def canonical_html_redirect_middleware(request: Request, call_next):
    target = CANONICAL_HTML_ROUTES.get(request.url.path)
    if target:
        query = request.url.query
        suffix = f"?{query}" if query else ""
        return RedirectResponse(url=f"{target}{suffix}", status_code=307)

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers[
        "Content-Security-Policy"
    ] = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://cloudflareinsights.com https://*.cloudflareinsights.com"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
def root_page():
    return RedirectResponse(url="/dashboard", status_code=307)


@app.get("/favicon.ico", include_in_schema=False)
def favicon_ico():
    return RedirectResponse(url="/favicon.svg", status_code=307)


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
app.include_router(versions_router)
app.mount("/", StaticFiles(directory="app/static", html=True), name="static")