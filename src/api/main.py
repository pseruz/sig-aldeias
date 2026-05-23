# src/api/main.py
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from contextlib import asynccontextmanager

# ✅ Import direto dos routers (evita circular import via __init__.py)
from src.api.routes.auth import router as auth_router
from src.api.routes.households import router as households_router
from src.api.routes.validation import router as validation_router
from src.api.routes.reports import router as reports_router

# Caminhos absolutos — funcionam independentemente do cwd do uvicorn
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_STATIC_DIR = _PROJECT_ROOT / "src" / "frontend" / "static"
_TEMPLATES_DIR = _PROJECT_ROOT / "src" / "frontend" / "templates"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Garante esquema e pasta SQLite em desenvolvimento local."""
    from src.api.database.connection import init_database

    init_database()
    yield


app = FastAPI(
    title="SIG-Aldeias API",
    version="0.2.1",
    lifespan=lifespan,
)

# Estáticos e templates (antes das rotas JSON/HTML)
app.mount("/static", StaticFiles(directory=str(_STATIC_DIR)), name="static")
templates = Jinja2Templates(directory=str(_TEMPLATES_DIR))

# ✅ Routers API JSON (inalterados)
app.include_router(auth_router)
app.include_router(households_router)
app.include_router(validation_router)
app.include_router(reports_router)


@app.get("/health")
def health_check():
    return {"status": "ok", "version": "0.2.1"}


@app.get("/map", response_class=HTMLResponse)
async def map_page(request: Request):
    return templates.TemplateResponse(
        "map.html",
        {"request": request, "title": "Mapa - SIG-Aldeias"},
    )


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        "map.html",
        {"request": request, "title": "SIG-Aldeias"},
    )
