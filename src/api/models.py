# src/api/models.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import declarative_base
from datetime import datetime, timezone


# ✅ Importar Base centralizada
from src.api.database.connection import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    
    # ✅ Colunas que estavam em falta:
    name = Column(String, default="Utilizador")          # ← ADICIONADO
    role = Column(String, default="tecnico")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))  # ← ADICIONADO
