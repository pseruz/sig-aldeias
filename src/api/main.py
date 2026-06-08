# src/api/main.py
from pathlib import Path

# ✅ CORRIGIDO: Adicionados Depends
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session  # ✅ NOVO
from contextlib import asynccontextmanager

# ✅ Import direto dos routers
from src.api.routes.auth import router as auth_router
from src.api.routes.households import router as households_router
from src.api.routes.validation import router as validation_router
from src.api.routes.reports import router as reports_router
from src.api.routes import ficha

# ✅ NOVO: Import da base de dados
from src.api.database.connection import get_db
from src.api.database.models import Household

# =============================================================================
# 2. INICIALIZAÇÃO (OBRIGATÓRIO: antes de qualquer @app.get)
# =============================================================================

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
app.include_router(ficha.router)

# =============================================================================
# 3. ROTAS DE SISTEMA (Simples, sem dependências)
# =============================================================================

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "0.2.1"}

# =============================================================================
# 4. ROTAS HTML (Páginas visíveis ao utilizador)
# =============================================================================

@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request, "title": "Login - SIG-Aldeias"})

@app.get("/relatorios", response_class=HTMLResponse)
async def reports_page(request: Request):
    return templates.TemplateResponse("relatorios.html", {"request": request, "title": "Relatórios - SIG-Aldeias"})

@app.get("/registo", response_class=HTMLResponse)
async def registo_page(request: Request):
    return templates.TemplateResponse(
        "registo.html",
        {"request": request, "title": "Registo de Agregado - SIG-Aldeias"},
    )

@app.get("/map", response_class=HTMLResponse)
async def map_page(request: Request, mode: str = "field"):
    return templates.TemplateResponse(
        "map.html",
        {
            "request": request,
            "title": "Mapa de Campo - SIG-Aldeias",
            "mode": mode,
        },
    )

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page(request: Request):
    return templates.TemplateResponse(
        "map.html",
        {
            "request": request,
            "title": "Dashboard Operacional - SIG-Aldeias",
            "mode": "command",
        },
    )

@app.get("/ficha/{household_id}", response_class=HTMLResponse)
async def ficha_page(request: Request, household_id: int, db: Session = Depends(get_db)):
    """Servir página HTML da ficha técnica com dados completos"""
    
    # Buscar agregado completo
    household = db.query(Household).filter(Household.id == household_id).first()
    
    if not household:
        raise HTTPException(status_code=404, detail="Agregado não encontrado")
    
    # Extrair latitude/longitude da location (WKT)
    latitude = 0.0
    longitude = 0.0
    if household.location:
        try:
            coords = household.location.replace("POINT(", "").replace(")", "").split()
            longitude = float(coords[0])
            latitude = float(coords[1])
        except:
            pass
    
    # ✅ CONVERTER DATETIME PARA STRING
    def format_datetime(dt):
        if dt is None:
            return None
        return dt.strftime('%Y-%m-%dT%H:%M:%S')
    
    # Criar objeto ficha com todos os dados (datetime convertido para string)
    ficha_data = {
        "id": household.id,
        "name": household.name,
        "location": household.location,
        "latitude": latitude,
        "longitude": longitude,
        "num_people": household.num_people,
        "num_floors": household.num_floors,
        "material": household.material,
        "has_elderly": household.has_elderly,
        "has_children": household.has_children,
        "has_mobility_issues": household.has_mobility_issues,
        "status": household.status,
        "rejection_reason": household.rejection_reason,
        "created_by": household.created_by,
        "validated_by": household.validated_by,
        "created_at": format_datetime(household.created_at),  # ✅ CONVERTIDO
        "validated_at": format_datetime(household.validated_at),  # ✅ CONVERTIDO
        "infrastructures": household.infrastructures or {},
        "observations": household.observations,
        "evacuation_point_name": household.evacuation_point_name,
        "evacuation_point_distance": household.evacuation_point_distance,
        "tee_minutes": household.tee_minutes,
        "utility_cutoffs": household.utility_cutoffs or {}
    }
    
    return templates.TemplateResponse(
        "ficha.html",
        {
            "request": request,
            "title": f"Ficha Técnica #{household_id} - SIG-Aldeias",
            "ficha": ficha_data,
        },
    )

# ← ÚNICA definição de "/" (homepage = dashboard)
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        "map.html",
        {
            "request": request,
            "title": "Dashboard Operacional - SIG-Aldeias",
            "mode": "command",
        },
    )