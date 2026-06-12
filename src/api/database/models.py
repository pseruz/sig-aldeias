# src/api/database/models.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum, JSON
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(Enum("admin", "tecnico", "coordenador", name="user_roles"), default="tecnico")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Household(Base):
    __tablename__ = "households"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
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
    created_at = Column(DateTime, default=datetime.utcnow)
    validated_at = Column(DateTime, nullable=True)
    infrastructures = Column(JSON, nullable=True, default=dict)
    
    # ✅ NOVOS CAMPOS: Inteligência Operacional (Ficha Técnica)
    observations = Column(Text, nullable=True)                              # Observações gerais
    evacuation_point_name = Column(String(100), nullable=True)              # Ex: "Campo de Futebol"
    evacuation_point_distance = Column(Integer, nullable=True)              # Distância em metros
    tee_minutes = Column(Integer, nullable=True)                            # Tempo Estimado de Evacuação (min)
    utility_cutoffs = Column(JSON, nullable=True, default=dict)             # Cortes de água/gás

class AccessLog(Base):
    __tablename__ = "access_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    household_id = Column(Integer, ForeignKey("households.id"), nullable=True)
    action = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class OperationalLayer(Base):
    __tablename__ = "operational_layers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False) # Ex: "Boca de Incêndio 01"
    layer_type = Column(String(50), nullable=False) # Ex: 'hydrant', 'meeting_point', 'evacuation_route'
    geometry = Column(String(255), nullable=False) # WKT: "POINT(-8.123 40.234)"
    description = Column(Text, nullable=True) # Detalhes técnicos (pressão, capacidade)
    status = Column(String(20), default="ACTIVE") # ACTIVE, PENDING, ARCHIVED
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)