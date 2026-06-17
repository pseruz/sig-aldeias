# src/api/routes/infrastructures.py
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from src.api.database.connection import get_db
from src.api.database import models
from src.api.schemas import infrastructure as schemas

router = APIRouter(prefix="/infrastructures", tags=["infrastructures"])

# 1. Listar todas as infraestruturas
@router.get("/", response_model=List[schemas.OperationalLayerResponse])
def list_infrastructures(db: Session = Depends(get_db)):
    return db.query(models.OperationalLayer).filter(models.OperationalLayer.status == "ACTIVE").all()

# 2. Criar uma infraestrutura manualmente (Ponto ou Polígono)
@router.post("/", response_model=schemas.OperationalLayerResponse)
def create_infrastructure(
    infra: schemas.OperationalLayerCreate, 
    db: Session = Depends(get_db)
):
    geometry_upper = infra.geometry.upper().strip()
    if not geometry_upper.startswith("POINT(") and not geometry_upper.startswith("POLYGON("):
        raise HTTPException(status_code=400, detail="Formato de geometria inválido. Use WKT POINT(...) ou POLYGON((...)).")

    # Nota: Pydantic v2 usa model_dump() em vez de dict()
    db_infra = models.OperationalLayer(
        **infra.model_dump(),
        created_by=None
    )
    db.add(db_infra)
    db.commit()
    db.refresh(db_infra)
    return db_infra

# 3. Editar uma infraestrutura (PUT)
@router.put("/{infra_id}", response_model=schemas.OperationalLayerResponse)
def update_infrastructure(
    infra_id: int, 
    infra_update: schemas.OperationalLayerUpdate, 
    db: Session = Depends(get_db)
):
    db_infra = db.query(models.OperationalLayer).filter(models.OperationalLayer.id == infra_id).first()
    if not db_infra:
        raise HTTPException(status_code=404, detail="Infraestrutura não encontrada")

    update_data = infra_update.model_dump(exclude_unset=True)
    
    # Validação de geometria se estiver a ser atualizada
    if "geometry" in update_data:
        geometry_upper = update_data["geometry"].upper().strip()
        if not geometry_upper.startswith("POINT(") and not geometry_upper.startswith("POLYGON("):
            raise HTTPException(status_code=400, detail="Formato de geometria inválido.")

    for key, value in update_data.items():
        setattr(db_infra, key, value)

    db.commit()
    db.refresh(db_infra)
    return db_infra

# 4. Apagar uma infraestrutura (Soft Delete - muda status para ARCHIVED)
@router.delete("/{infra_id}")
def delete_infrastructure(infra_id: int, db: Session = Depends(get_db)):
    db_infra = db.query(models.OperationalLayer).filter(models.OperationalLayer.id == infra_id).first()
    if not db_infra:
        raise HTTPException(status_code=404, detail="Infraestrutura não encontrada")
    
    db_infra.status = "ARCHIVED"
    db.commit()
    return {"message": "Infraestrutura arquivada com sucesso"}

# 5. Upload de ficheiro GeoJSON (Simulação BIM/Revit)
@router.post("/upload-geojson", response_model=schemas.UploadResult)
async def upload_geojson(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.geojson'):
        raise HTTPException(status_code=400, detail="Apenas ficheiros .geojson são aceites.")
    
    try:
        content = await file.read()
        geojson_data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Ficheiro GeoJSON inválido.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao ler o ficheiro: {str(e)}")

    if geojson_data.get("type") != "FeatureCollection":
        raise HTTPException(status_code=400, detail="O ficheiro deve ser uma FeatureCollection.")

    imported_count = 0
    errors = []

    for i, feature in enumerate(geojson_data.get("features", [])):
        try:
            geom = feature.get("geometry", {})
            props = feature.get("properties", {})
            
            geom_type = geom.get("type", "").upper()
            coords = geom.get("coordinates", [])

            wkt = ""
            if geom_type == "POINT":
                # GeoJSON: [lng, lat] -> WKT: POINT(lng lat)
                wkt = f"POINT({coords[0]} {coords[1]})"
            elif geom_type == "POLYGON":
                # GeoJSON: [[[lng, lat], ...]] -> WKT: POLYGON((lng lat, ...))
                ring_str = ", ".join([f"{c[0]} {c[1]}" for c in coords[0]])
                wkt = f"POLYGON(({ring_str}))"
            else:
                errors.append(f"Feature {i}: Tipo de geometria {geom_type} não suportado.")
                continue

            new_infra = models.OperationalLayer(
                name=props.get("name", f"Importado_{i}"),
                layer_type=props.get("type", props.get("layer_type", "unknown")),
                geometry=wkt,
                description=props.get("description", json.dumps(props)),
                status="ACTIVE"
            )
            db.add(new_infra)
            imported_count += 1
        except Exception as e:
            errors.append(f"Feature {i}: {str(e)}")

    db.commit()

    return {
        "message": f"Processamento concluído. {imported_count} itens importados.",
        "imported_count": imported_count,
        "errors": errors
    }