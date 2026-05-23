# src/api/main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager

# ✅ Import direto dos routers (evita circular import via __init__.py)
from src.api.routes.auth import router as auth_router
from src.api.routes.households import router as households_router
from src.api.routes.validation import router as validation_router
from src.api.routes.reports import router as reports_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Garante esquema e pasta SQLite em desenvolvimento local."""
    from src.api.database.connection import init_database

    init_database()
    yield

app = FastAPI(
    title="SIG-Aldeias API",
    version="0.2.1",
    lifespan=lifespan
)

# ✅ Incluir routers diretamente
app.include_router(auth_router)
app.include_router(households_router)
app.include_router(validation_router)
app.include_router(reports_router)

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "0.2.1"}
