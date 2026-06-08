# src/api/schemas/ficha.py
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class FichaUpdate(BaseModel):
    """Schema para atualização da ficha técnica (apenas supervisor/admin)"""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    num_people: Optional[int] = Field(None, ge=1, le=20)
    num_floors: Optional[int] = Field(None, ge=1, le=5)
    material: Optional[str] = None
    has_elderly: Optional[bool] = None
    has_children: Optional[bool] = None
    has_mobility_issues: Optional[bool] = None
    observations: Optional[str] = None
    
    # Inteligência Operacional
    evacuation_point_name: Optional[str] = Field(None, max_length=100)
    evacuation_point_distance: Optional[int] = Field(None, ge=0)
    tee_minutes: Optional[int] = Field(None, ge=0)
    utility_cutoffs: Optional[Dict[str, Any]] = None
    
    # Infraestruturas
    infrastructures: Optional[Dict[str, Any]] = None

class FichaResponse(BaseModel):
    """Schema de resposta completo da ficha"""
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
    
    # Inteligência Operacional
    observations: Optional[str]
    evacuation_point_name: Optional[str]
    evacuation_point_distance: Optional[int]
    tee_minutes: Optional[int]
    utility_cutoffs: Optional[Dict[str, Any]]
    
    class Config:
        from_attributes = True