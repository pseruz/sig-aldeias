# tests/conftest.py
import os
os.environ["TESTING"] = "true"

import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Enum, Float, Text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool

TestBase = declarative_base()

class TestHousehold(TestBase):
    __tablename__ = "households"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    location = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    num_people = Column(Integer, nullable=False)
    num_floors = Column(Integer, nullable=False)
    material = Column(Enum("betão", "madeira", "alvenaria", name="building_materials"), nullable=False)
    has_elderly = Column(Boolean, default=False)
    has_children = Column(Boolean, default=False)
    has_mobility_issues = Column(Boolean, default=False)
    status = Column(Enum("pendente", "validado", "rejeitado", name="validation_status"), default="pendente")
    rejection_reason = Column(Text, nullable=True)
    created_by = Column(Integer, nullable=False)
    validated_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    validated_at = Column(DateTime, nullable=True)

class TestUser(TestBase):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(Enum("admin", "tecnico", "coordenador", name="user_roles"), default="tecnico")
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    TestBase.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        TestBase.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
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
    from src.api.security.auth import get_password_hash
    user = TestUser(
        email="test@pc.pt",
        password_hash=get_password_hash("password123"),
        name="Técnico Teste",
        role="tecnico"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user
