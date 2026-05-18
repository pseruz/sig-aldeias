# src/api/database/models.py
import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(Enum("admin", "tecnico", "coordenador", name="user_roles"), default="tecnico")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Household(Base):
    __tablename__ = "households"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    # ✅ Temporariamente String para compatibilidade SQLite/PostgreSQL.
    # Guarda formato WKT: "POINT(lon lat)". Migração para PostGIS é trivial depois.
    location = Column(String(255), nullable=True)
    num_people = Column(Integer, nullable=False)
    num_floors = Column(Integer, nullable=False)
    material = Column(Enum("betão", "madeira", "alvenaria", name="building_materials"), nullable=False)
    has_elderly = Column(Boolean, default=False)
    has_children = Column(Boolean, default=False)
    has_mobility_issues = Column(Boolean, default=False)
    status = Column(Enum("pendente", "validado", "rejeitado", name="validation_status"), default="pendente")
    rejection_reason = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    validated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    validated_at = Column(DateTime, nullable=True)

class AccessLog(Base):
    __tablename__ = "access_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    household_id = Column(Integer, ForeignKey("households.id"), nullable=True)
    action = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
