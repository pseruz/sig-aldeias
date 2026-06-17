import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.api.database.connection import SessionLocal
from src.api.database.models import OperationalLayer

db = SessionLocal()
zone = OperationalLayer(
    name="Zona de Incêndio Ativa (Teste)",
    layer_type="fire_zone",
    geometry="POLYGON((-8.056 40.214, -8.050 40.214, -8.050 40.219, -8.056 40.219, -8.056 40.214))",
    description="Simulação de área afetada",
    status="ACTIVE"
)
db.add(zone)
db.commit()
print("✅ Zona de teste adicionada!")
db.close()