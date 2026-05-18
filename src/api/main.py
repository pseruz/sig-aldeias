# src/api/main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
from src.api.routes import auth, households, validation
from src.api.routes import auth, households, validation, reports  # ✅ Adicionar reports

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan vazio. A inicialização da BD é gerida por:
    - Produção: Alembic ou scripts/init_db.py
    - Testes: fixtures do pytest com SQLite em memória
    """
    yield

app = FastAPI(
    title="SIG-Aldeias API",
    version="0.2.0",
    lifespan=lifespan
)

app.include_router(auth.router)
app.include_router(households.router)
app.include_router(validation.router)
app.include_router(reports.router)  # ✅ Incluir router de relatórios

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "0.2.0"}
