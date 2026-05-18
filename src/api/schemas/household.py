from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime

class HouseholdBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    num_people: int = Field(..., ge=1, le=20)
    num_floors: int = Field(..., ge=1, le=5)
    material: Literal["betão", "madeira", "alvenaria"]
    has_elderly: bool = False
    has_children: bool = False
    has_mobility_issues: bool = False
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Nome não pode estar vazio")
        return v.strip()

class HouseholdCreate(HouseholdBase): pass

class HouseholdUpdate(BaseModel):
    name: Optional[str] = None
    num_people: Optional[int] = Field(None, ge=1, le=20)
    num_floors: Optional[int] = Field(None, ge=1, le=5)
    material: Optional[Literal["betão", "madeira", "alvenaria"]] = None
    has_elderly: Optional[bool] = None
    has_children: Optional[bool] = None
    has_mobility_issues: Optional[bool] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)

class HouseholdResponse(HouseholdBase):
    id: int
    status: Literal["pendente", "validado", "rejeitado"]
    rejection_reason: Optional[str] = None
    created_by: int
    validated_by: Optional[int] = None
    created_at: datetime
    validated_at: Optional[datetime] = None

    class Config:
        from_attributes = True