# src/api/routes/households.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from src.api.database.connection import get_db
from src.api.database.models import Household, User, AccessLog
from src.api.schemas.household import HouseholdCreate, HouseholdUpdate, HouseholdResponse
from src.api.dependencies import get_current_user
from typing import List, Optional

router = APIRouter(prefix="/households", tags=["households"])

def _apply_filters(query, material: Optional[str], has_elderly: Optional[bool], 
                   has_children: Optional[bool], status: Optional[str]):
    """
    Aplica filtros de forma eficiente e segura.
    Usa 'is not None' para permitir filtrar por False explicitamente.
    """
    if material:
        query = query.filter(Household.material == material)
    if has_elderly is not None:
        query = query.filter(Household.has_elderly == has_elderly)
    if has_children is not None:
        query = query.filter(Household.has_children == has_children)
    if status:
        query = query.filter(Household.status == status)
    return query


@router.post("/", response_model=HouseholdResponse, status_code=201)
def create_household(household: HouseholdCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # Guarda coordenadas em formato WKT padrão. Compatível com SQLite e PostgreSQL.
    location_wkt = f"POINT({household.longitude} {household.latitude})"
    
    new_household = Household(
        **household.model_dump(exclude={"latitude", "longitude"}),
        location=location_wkt,
        created_by=user.id
    )
    db.add(new_household)
    db.commit()
    db.refresh(new_household)
    
    log = AccessLog(user_id=user.id, household_id=new_household.id, action="CREATE", ip_address="127.0.0.1")
    db.add(log)
    db.commit()
    return new_household


@router.get("/", response_model=List[HouseholdResponse])
def list_households(
    material: Optional[str] = Query(None, description="Filtrar por material (betão/madeira/alvenaria)"),
    has_elderly: Optional[bool] = Query(None, description="Filtrar por presença de idosos"),
    has_children: Optional[bool] = Query(None, description="Filtrar por presença de crianças"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filtrar por estado (pendente/validado/rejeitado)"),
    limit: int = Query(100, ge=1, le=500, description="Limite de resultados por página"),
    offset: int = Query(0, ge=0, description="Offset para paginação"),
    db: Session = Depends(get_db)
):
    """Lista agregados com filtros combinados e paginação otimizada."""
    query = db.query(Household)
    query = _apply_filters(query, material, has_elderly, has_children, status_filter)
    
    # Ordenação descendente + paginação para performance
    return query.order_by(Household.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/{household_id}", response_model=HouseholdResponse)
def get_household(household_id: int, db: Session = Depends(get_db)):
    household = db.query(Household).filter(Household.id == household_id).first()
    if not household:
        raise HTTPException(status_code=404, detail="Agregado não encontrado")
    return household


@router.put("/{household_id}", response_model=HouseholdResponse)
def update_household(household_id: int, updates: HouseholdUpdate, db: Session = Depends(get_db)):
    household = db.query(Household).filter(Household.id == household_id).first()
    if not household:
        raise HTTPException(status_code=404, detail="Agregado não encontrado")
    
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field not in ["latitude", "longitude"]:
            setattr(household, field, value)
            
    # Atualizar localização WKT se coordenadas forem enviadas
    if "latitude" in update_data or "longitude" in update_data:
        lat = update_data.get("latitude", 0.0)
        lon = update_data.get("longitude", 0.0)
        household.location = f"POINT({lon} {lat})"
        
    db.commit()
    db.refresh(household)
    return household
