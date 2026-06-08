# src/api/security/auth.py
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from src.api.config import settings

# =============================================================================
# CONFIGURAÇÃO DE SEGURANÇA (ATUALIZADO)
# =============================================================================

# ✅ Usar pbkdf2_sha256 (compatível com o seed_roles.py corrigido)
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"], 
    deprecated="auto",
    pbkdf2_sha256__default_rounds=29000
)

# =============================================================================
# FUNÇÕES DE UTILIDADE
# =============================================================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a password plain text corresponde ao hash guardado."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Gera hash de uma password para guardar na BD."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Cria um token JWT com os dados fornecidos."""
    to_encode = data.copy()
    
    # Definir expiry
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    # Assinar token
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.SECRET_KEY, 
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt