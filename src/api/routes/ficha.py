# src/api/routes/ficha.py
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from src.api.database.connection import get_db
from src.api.database.models import Household, User, AccessLog
from src.api.dependencies import get_current_user

router = APIRouter(prefix="/api/ficha", tags=["ficha"])

class FichaUpdate(BaseModel):
    """Schema para atualização da ficha técnica"""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    num_people: Optional[int] = Field(None, ge=1, le=20)
    num_floors: Optional[int] = Field(None, ge=1, le=5)
    material: Optional[str] = None
    has_elderly: Optional[bool] = None
    has_children: Optional[bool] = None
    has_mobility_issues: Optional[bool] = None
    observations: Optional[str] = None
    evacuation_point_name: Optional[str] = Field(None, max_length=100)
    evacuation_point_distance: Optional[int] = Field(None, ge=0)
    tee_minutes: Optional[int] = Field(None, ge=0)
    utility_cutoffs: Optional[Dict[str, Any]] = None
    infrastructures: Optional[Dict[str, Any]] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)

class FichaResponse(BaseModel):
    """Schema de resposta completo"""
    id: int
    name: str
    location: Optional[str]
    latitude: float
    longitude: float
    num_people: int
    num_floors: int
    material: str
    has_elderly: bool
    has_children: bool
    has_mobility_issues: bool
    status: str
    rejection_reason: Optional[str]
    created_by: int
    validated_by: Optional[int]
    created_at: datetime
    validated_at: Optional[datetime]
    infrastructures: Optional[Dict[str, Any]]
    observations: Optional[str]
    evacuation_point_name: Optional[str]
    evacuation_point_distance: Optional[int]
    tee_minutes: Optional[int]
    utility_cutoffs: Optional[Dict[str, Any]]
    
    class Config:
        from_attributes = True

def format_datetime(dt):
    if dt is None:
        return None
    return dt.strftime('%Y-%m-%dT%H:%M:%S')

@router.get("/{household_id}", response_model=FichaResponse)
def get_ficha(
    household_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter ficha técnica completa"""
    household = db.query(Household).filter(Household.id == household_id).first()
    
    if not household:
        raise HTTPException(status_code=404, detail="Agregado não encontrado")
    
    latitude = 0.0
    longitude = 0.0
    if household.location:
        try:
            coords = household.location.replace("POINT(", "").replace(")", "").split()
            longitude = float(coords[0])
            latitude = float(coords[1])
        except:
            pass
    
    return FichaResponse(
        id=household.id,
        name=household.name,
        location=household.location,
        latitude=latitude,
        longitude=longitude,
        num_people=household.num_people,
        num_floors=household.num_floors,
        material=household.material,
        has_elderly=household.has_elderly,
        has_children=household.has_children,
        has_mobility_issues=household.has_mobility_issues,
        status=household.status,
        rejection_reason=household.rejection_reason,
        created_by=household.created_by,
        validated_by=household.validated_by,
        created_at=household.created_at,
        validated_at=household.validated_at,
        infrastructures=household.infrastructures or {},
        observations=household.observations,
        evacuation_point_name=household.evacuation_point_name,
        evacuation_point_distance=household.evacuation_point_distance,
        tee_minutes=household.tee_minutes,
        utility_cutoffs=household.utility_cutoffs or {}
    )

@router.put("/{household_id}", response_model=FichaResponse)
def update_ficha(
    household_id: int,
    data: FichaUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualizar ficha técnica (apenas supervisor)"""
    if current_user.role not in ["admin", "coordenador"]:
        raise HTTPException(status_code=403, detail="Apenas supervisores podem editar")
    
    household = db.query(Household).filter(Household.id == household_id).first()
    
    if not household:
        raise HTTPException(status_code=404, detail="Agregado não encontrado")
    
    changes = []
    
    # Atualizar campos principais
    update_fields = [
        "name", "num_people", "num_floors", "material",
        "has_elderly", "has_children", "has_mobility_issues",
        "observations", "evacuation_point_name", "evacuation_point_distance",
        "tee_minutes", "utility_cutoffs"
    ]
    
    for field in update_fields:
        value = getattr(data, field)
        if value is not None:
            old_value = getattr(household, field)
            if old_value != value:
                changes.append(f"{field}: {old_value} → {value}")
                setattr(household, field, value)
    
    # Atualizar coordenadas do agregado
    if data.latitude is not None and data.longitude is not None:
        new_location = f"POINT({data.longitude} {data.latitude})"
        if household.location != new_location:
            changes.append(f"location: {household.location} → {new_location}")
            household.location = new_location
    
    # ✅ Atualizar coordenadas das infraestruturas
    if data.infrastructures is not None:
        old_infra = household.infrastructures or {}
        if old_infra != data.infrastructures:
            changes.append("infrastructures: atualizadas")
            household.infrastructures = data.infrastructures
    
    # Registar no audit log
    if changes:
        try:
            access_log = AccessLog(
                user_id=current_user.id,
                household_id=household_id,
                action=f"update_ficha: {', '.join(changes[:3])}",
                ip_address=request.client.host if request.client else None
            )
            db.add(access_log)
            db.commit()
        except Exception as e:
            print(f"Erro ao registar audit log: {e}")
    
    db.refresh(household)
    
    # Retornar ficha atualizada
    latitude = 0.0
    longitude = 0.0
    if household.location:
        try:
            coords = household.location.replace("POINT(", "").replace(")", "").split()
            longitude = float(coords[0])
            latitude = float(coords[1])
        except:
            pass
    
    return FichaResponse(
        id=household.id,
        name=household.name,
        location=household.location,
        latitude=latitude,
        longitude=longitude,
        num_people=household.num_people,
        num_floors=household.num_floors,
        material=household.material,
        has_elderly=household.has_elderly,
        has_children=household.has_children,
        has_mobility_issues=household.has_mobility_issues,
        status=household.status,
        rejection_reason=household.rejection_reason,
        created_by=household.created_by,
        validated_by=household.validated_by,
        created_at=household.created_at,
        validated_at=household.validated_at,
        infrastructures=household.infrastructures or {},
        observations=household.observations,
        evacuation_point_name=household.evacuation_point_name,
        evacuation_point_distance=household.evacuation_point_distance,
        tee_minutes=household.tee_minutes,
        utility_cutoffs=household.utility_cutoffs or {}
    )