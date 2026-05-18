from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from src.api.config import settings
from src.api.database.connection import get_db
from src.api.database.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Credenciais inválidas")
    except JWTError:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Utilizador não encontrado")
    return user

def get_current_technician(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ["tecnico", "admin"]:
        raise HTTPException(status_code=403, detail="Acesso reservado a técnicos")
    return current_user