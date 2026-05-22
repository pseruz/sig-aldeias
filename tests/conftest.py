# tests/conftest.py
# IMPORTANTE: definir variáveis de ambiente ANTES de importar qualquer módulo src.api
import os

os.environ["TESTING"] = "true"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import hashlib
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Modelos de teste = modelos da app (mesmo Base/tabelas; location String(255) WKT)
from src.api.database.models import Base, User as TestUser, Household as TestHousehold


def _test_password_hash(password: str) -> str:
    """
    Hash determinístico para testes — evita bcrypt (passlib) que falha em alguns ambientes.
    Compatível com verify_password() em src/api/security/auth.py (prefixo test_sha256_).
    """
    digest = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return f"test_sha256_{digest}"


SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Sessão SQLite em memória; recria esquema por teste (isolamento)."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """
    TestClient com override de get_db — a API nunca abre ligação PostgreSQL nos testes.
    """
    from src.api.main import app
    from src.api.database.connection import get_db

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session):
    """Utilizador técnico sintético para login OAuth2 (Form Data)."""
    user = TestUser(
        email="test@pc.pt",
        password_hash=_test_password_hash("password123"),
        name="Técnico Teste",
        role="tecnico",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user
