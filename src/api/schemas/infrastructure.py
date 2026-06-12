# src/api/schemas/infrastructure.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class OperationalLayerBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    layer_type: str = Field(..., description="Tipo: hydrant, meeting_point, shelter, etc.")
    geometry: str = Field(..., description="Formato WKT: POINT(lng lat)")
    description: Optional[str] = None
    status: str = Field(default="ACTIVE")

class OperationalLayerCreate(OperationalLayerBase):
    pass

class OperationalLayerResponse(OperationalLayerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True # Pydantic v2