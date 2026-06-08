#!/usr/bin/env python3
"""Cria utilizadores padrão com 3 níveis de acesso (Versão Final Corrigida)."""
import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.api.database.connection import SessionLocal, init_database, Base
from src.api.models import User
from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"], 
    deprecated="auto",
    pbkdf2_sha256__default_rounds=29000
)

def seed_users():
    print("🔄 A inicializar base de dados...")
    try:
        # Garante que os modelos são registados antes de criar tabelas
        from src.api import models 
        init_database()
        print("✅ Base de dados pronta.")
    except Exception as e:
        print(f"❌ Erro ao inicializar DB: {e}")
        import traceback
        traceback.print_exc()
        return

    db = SessionLocal()
    
    users = [
        {"email": "admin@pc.pt", "password": "admin123", "role": "admin"},
        {"email": "supervisor@pc.pt", "password": "sup123", "role": "coordenador"},
        {"email": "tecnico@pc.pt", "password": "tec123", "role": "tecnico"},
    ]
    
    try:
        count = 0
        for u in users:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                # Truncagem de segurança para pbkdf2 (limite 72 bytes para compatibilidade)
                raw_pwd = u["password"]
                safe_pwd = raw_pwd[:72] if len(raw_pwd) > 72 else raw_pwd
                hashed = pwd_context.hash(safe_pwd)
                
                # ✅ Campos completos incluindo name e created_at
                db.add(User(
                    email=u["email"],
                    password_hash=hashed,
                    role=u["role"],
                    name=u["email"].split("@")[0].title(),  # Ex: "Admin" de "admin@pc.pt"
                    is_active=True,
                    created_at=datetime.now(timezone.utc)
                ))
                print(f"✅ Criado: {u['email']} ({u['role']})")
                count += 1
            else:
                print(f"⚠️ Já existe: {u['email']}")
        
        if count > 0:
            db.commit()
            print(f"\n🎉 {count} utilizador(es) criado(s) com sucesso!")
        else:
            print("\nℹ️ Não foi criado ninguém novo.")

        print("\n🔑 Credenciais para teste:")
        for u in users:
            print(f"   {u['role'].upper():12} | {u['email']} | {u['password']}")
            
    except ValueError as ve:
        db.rollback()
        print(f"❌ Erro de valor: {ve}")
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao inserir dados: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()