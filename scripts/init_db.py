# scripts/init_db.py
#!/usr/bin/env python3
"""
Script para inicializar a base de dados em produção/desenvolvimento.
Executar apenas uma vez ou quando o schema mudar.

Uso: python scripts/init_db.py
"""
import sys
import os

# Adicionar raiz do projeto ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.api.config import settings
from src.api.database.models import Base
from sqlalchemy import create_engine

def init_db():
    """Cria todas as tabelas na base de dados configurada"""
    print(f"🔄 A conectar a: {settings.DATABASE_URL}")
    engine = create_engine(settings.DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    print("✅ Base de dados inicializada com sucesso!")

if __name__ == "__main__":
    init_db()
