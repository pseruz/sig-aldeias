# src/api/routes/infrastructures.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from src.api.database.connection import get_db
from src.api.database import models
from src.api.schemas import infrastructure as schemas

router = APIRouter(prefix="/infrastructures", tags=["infrastructures"])

# 1. Listar todas as infraestruturas (Para o mapa carregar)
@router.get("/", response_model=List[schemas.OperationalLayerResponse])
def list_infrastructures(db: Session = Depends(get_db)):
    return db.query(models.OperationalLayer).filter(models.OperationalLayer.status == "ACTIVE").all()

# 2. Criar uma nova infraestrutura (Sem autenticação por agora)
@router.post("/", response_model=schemas.OperationalLayerResponse)
def create_infrastructure(
    infra: schemas.OperationalLayerCreate, 
    db: Session = Depends(get_db)
):
    # Verificar se o formato WKT é básico
    if not infra.geometry.startswith("POINT("):
        raise HTTPException(status_code=400, detail="Formato de geometria inválido. Use WKT POINT(lng lat).")

    db_infra = models.OperationalLayer(
        **infra.dict(),
        created_by=None  # Sem autenticação por agora
    )
    db.add(db_infra)
    db.commit()
    db.refresh(db_infra)
    return db_infra