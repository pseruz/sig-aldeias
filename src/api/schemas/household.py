import re
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, Literal, Any
from datetime import datetime

_WKT_POINT = re.compile(r"POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)", re.IGNORECASE)


def _coords_from_wkt(location: str | None) -> tuple[float, float]:
    """Converte WKT POINT(lon lat) em (latitude, longitude) para a resposta API."""
    if not location:
        return 0.0, 0.0
    match = _WKT_POINT.match(location.strip())
    if not match:
        return 0.0, 0.0
    lon, lat = float(match.group(1)), float(match.group(2))
    return lat, lon

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

    @model_validator(mode="before")
    @classmethod
    def inject_coords_from_location(cls, data: Any) -> Any:
        """O ORM guarda apenas location (WKT); a API expõe latitude/longitude no JSON."""
        if isinstance(data, dict):
            if "latitude" not in data and data.get("location"):
                lat, lon = _coords_from_wkt(data["location"])
                return {**data, "latitude": lat, "longitude": lon}
            return data
        if hasattr(data, "location"):
            lat, lon = _coords_from_wkt(getattr(data, "location", None))
            return {
                "id": data.id,
                "name": data.name,
                "num_people": data.num_people,
                "num_floors": data.num_floors,
                "material": data.material,
                "has_elderly": data.has_elderly,
                "has_children": data.has_children,
                "has_mobility_issues": data.has_mobility_issues,
                "latitude": lat,
                "longitude": lon,
                "status": data.status,
                "rejection_reason": data.rejection_reason,
                "created_by": data.created_by,
                "validated_by": data.validated_by,
                "created_at": data.created_at,
                "validated_at": data.validated_at,
            }
        return data

    class Config:
        from_attributes = True