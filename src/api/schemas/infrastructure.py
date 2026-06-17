# src/api/schemas/infrastructure.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class OperationalLayerBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    layer_type: str = Field(..., description="Tipo: hydrant, public_building, fire_zone, flood_zone, forest_zone")
    geometry: str = Field(..., description="Formato WKT: POINT(lng lat) ou POLYGON((...))")
    description: Optional[str] = None
    status: str = Field(default="ACTIVE")

class OperationalLayerCreate(OperationalLayerBase):
    pass

class OperationalLayerUpdate(BaseModel):
    name: Optional[str] = None
    layer_type: Optional[str] = None
    geometry: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class OperationalLayerResponse(OperationalLayerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True # Pydantic v2

class UploadResult(BaseModel):
    message: str
    imported_count: int
    errors: List[str] = []