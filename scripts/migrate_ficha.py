import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.api.database.connection import engine, init_database
from sqlalchemy import text

def migrate():
    print("🔄 A migrar base de dados...")
    init_database()
    
    new_columns = [
        ("observations", "TEXT"),
        ("evacuation_point_name", "VARCHAR(100)"),
        ("evacuation_point_distance", "INTEGER"),
        ("tee_minutes", "INTEGER"),
        ("utility_cutoffs", "TEXT"),
    ]
    
    with engine.connect() as conn:
        for col_name, col_type in new_columns:
            try:
                conn.execute(text(f"ALTER TABLE households ADD COLUMN {col_name} {col_type}"))
                conn.commit()
                print(f"   ✅ Coluna '{col_name}' adicionada")
            except Exception as e:
                if "duplicate" in str(e).lower() or "already exists" in str(e).lower():
                    print(f"   ⚪ Coluna '{col_name}' já existe")
                else:
                    print(f"   ❌ Erro em '{col_name}': {e}")
    
    print("✅ Migração concluída!")

if __name__ == "__main__":
    migrate()
