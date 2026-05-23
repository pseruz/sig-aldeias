# src/api/config.py
from pydantic import field_validator
from pydantic_settings import BaseSettings

_SQLITE_DEV_DEFAULT = "sqlite:///./data/sig_aldeias.db"


class Settings(BaseSettings):
    # Database — SQLite local por defeito; PostgreSQL apenas se definido no .env
    DATABASE_URL: str = _SQLITE_DEV_DEFAULT

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def sqlite_fallback_if_empty(cls, value: object) -> str:
        """Usa SQLite de dev se a variável não existir ou estiver vazia no .env."""
        if value is None or (isinstance(value, str) and not value.strip()):
            return _SQLITE_DEV_DEFAULT
        return str(value)
    
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