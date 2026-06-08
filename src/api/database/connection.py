# src/api/database/connection.py
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.api.config import settings

# =============================================================================
# BASE CENTRALIZADA (importar daqui em todos os models)
# =============================================================================
from sqlalchemy.orm import declarative_base
Base = declarative_base()

def _ensure_sqlite_directory(database_url: str) -> None:
    """Cria a pasta do ficheiro SQLite local (ex.: ./data/) antes do primeiro acesso."""
    if not database_url.startswith("sqlite"):
        return
    if database_url in ("sqlite:///:memory:", "sqlite://"):
        return
    # sqlite:///./data/app.db ou sqlite:////abs/path.db
    raw_path = database_url.removeprefix("sqlite:///").removeprefix("sqlite:////")
    if not raw_path or raw_path == ":memory:":
        return
    db_path = Path(raw_path)
    if not db_path.is_absolute():
        db_path = Path.cwd() / db_path
    db_path.parent.mkdir(parents=True, exist_ok=True)


def _build_engine(database_url: str):
    """
    Engine por tipo de URL: SQLite (dev local) ou PostgreSQL (se definido no .env).
    Não abre ligação na importação — só no primeiro uso da sessão.
    """
    kwargs: dict = {}
    if database_url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
        # StaticPool só é necessário para :memory: (partilha BD entre threads do uvicorn)
        if database_url in ("sqlite:///:memory:", "sqlite://"):
            kwargs["poolclass"] = StaticPool
    elif database_url.startswith("postgresql"):
        kwargs["pool_pre_ping"] = True
    return create_engine(database_url, **kwargs)


_ensure_sqlite_directory(settings.DATABASE_URL)
engine = _build_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_database() -> None:
    """Cria tabelas em falta (útil em desenvolvimento local com SQLite)."""
    from src.api.database.models import Base
    
    # ✅ CRÍTICO: Importar explicitamente TODOS os modelos
    # Isto regista as tabelas na Base.metadata ANTES do create_all()
    from src.api.database.models import User, Household, AccessLog

    _ensure_sqlite_directory(settings.DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    
    # Debug: mostrar tabelas criadas
    print(f"✅ Tabelas criadas: {list(Base.metadata.tables.keys())}")