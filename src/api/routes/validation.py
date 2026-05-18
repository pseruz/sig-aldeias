from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from src.api.database.connection import get_db
from src.api.database.models import Household, User, AccessLog
from src.api.schemas.validation import ValidationRequest
from src.api.dependencies import get_current_technician

router = APIRouter(prefix="/validation", tags=["validation"])

@router.post("/{household_id}")
def validate_household(household_id: int, req: ValidationRequest, db: Session = Depends(get_db), tech: User = Depends(get_current_technician)):
    household = db.query(Household).filter(Household.id == household_id).first()
    if not household:
        raise HTTPException(status_code=404, detail="Agregado não encontrado")
    if household.status != "pendente":
        raise HTTPException(status_code=400, detail="Agregado já foi validado ou rejeitado")
    
    household.status = req.status
    household.validated_by = tech.id
    household.validated_at = datetime.utcnow()
    if req.status == "rejeitado" and not req.reason:
        raise HTTPException(status_code=400, detail="Justificação obrigatória para rejeição")
    household.rejection_reason = req.reason
    
    log = AccessLog(user_id=tech.id, household_id=household.id, action=f"VALIDATE_{req.status.upper()}", ip_address="127.0.0.1")
    db.add(log)
    db.commit()
    return {"message": f"Agregado {req.status} com sucesso", "household_id": household.id}