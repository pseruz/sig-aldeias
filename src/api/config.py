# src/api/config.py
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://sig_user:sig_pass@localhost:5432/sig_aldeias"
    
    # Security
    SECRET_KEY: str = "alterar_para_chave_segura_em_producao"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Application (opcional - para uvicorn)
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignorar variáveis não declaradas (útil para desenvolvimento)

settings = Settings()