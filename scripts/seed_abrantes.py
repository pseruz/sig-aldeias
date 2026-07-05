"""Popular dados de teste na zona de Abrantes"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.api.database.connection import SessionLocal, init_database
from src.api.database.models import User, Household, OperationalLayer
from src.api.security.auth import get_password_hash

def seed_abrantes():
    """Cria utilizadores e agregados na zona de Abrantes"""
    init_database()
    db = SessionLocal()
    
    # Coordenadas centrais de Abrantes
    ABRANTES_LAT = 39.4706
    ABRANTES_LNG = -8.2003
    
    # Criar utilizadores
    users = [
        User(email="admin@sig-aldeias.pt", name="Admin Sistema",
             password_hash=get_password_hash("Admin123!"), role="admin"),
        User(email="coord@sig-aldeias.pt", name="Coordenador Mendes",
             password_hash=get_password_hash("Coord123!"), role="coordenador"),
        User(email="tec@sig-aldeias.pt", name="Técnico Silva",
             password_hash=get_password_hash("Tec123!"), role="tecnico"),
    ]
    db.add_all(users)
    db.commit()
    
    # Dados de agregados fictícios em Abrantes
    households_data = [
        {"name": "Família Costa", "lat": 39.4710, "lng": -8.2010, "people": 4, "floors": 2, "material": "betão", "elderly": True},
        {"name": "Família Santos", "lat": 39.4715, "lng": -8.2005, "people": 3, "floors": 1, "material": "alvenaria", "elderly": False},
        {"name": "Família Oliveira", "lat": 39.4705, "lng": -8.2015, "people": 5, "floors": 2, "material": "betão", "elderly": True},
        {"name": "Família Ferreira", "lat": 39.4720, "lng": -8.1995, "people": 2, "floors": 1, "material": "madeira", "elderly": True},
        {"name": "Família Silva", "lat": 39.4700, "lng": -8.2020, "people": 6, "floors": 3, "material": "betão", "elderly": False},
        {"name": "Família Pereira", "lat": 39.4725, "lng": -8.2000, "people": 3, "floors": 2, "material": "alvenaria", "elderly": True},
        {"name": "Família Rodrigues", "lat": 39.4695, "lng": -8.2025, "people": 4, "floors": 1, "material": "madeira", "elderly": False},
        {"name": "Família Martins", "lat": 39.4730, "lng": -8.1990, "people": 2, "floors": 2, "material": "betão", "elderly": True},
        {"name": "Família Sousa", "lat": 39.4690, "lng": -8.2030, "people": 5, "floors": 1, "material": "alvenaria", "elderly": False},
        {"name": "Família Gonçalves", "lat": 39.4735, "lng": -8.1985, "people": 3, "floors": 2, "material": "betão", "elderly": True},
        {"name": "Família Lopes", "lat": 39.4685, "lng": -8.2035, "people": 4, "floors": 3, "material": "betão", "elderly": False},
        {"name": "Família Marques", "lat": 39.4740, "lng": -8.1980, "people": 2, "floors": 1, "material": "madeira", "elderly": True},
        {"name": "Família Alves", "lat": 39.4680, "lng": -8.2040, "people": 6, "floors": 2, "material": "alvenaria", "elderly": False},
        {"name": "Família Nunes", "lat": 39.4745, "lng": -8.1975, "people": 3, "floors": 2, "material": "betão", "elderly": True},
        {"name": "Família Cardoso", "lat": 39.4675, "lng": -8.2045, "people": 4, "floors": 1, "material": "madeira", "elderly": False},
    ]
    
    for h in households_data:
        # Converter para WKT
        location = f"POINT({h['lng']} {h['lat']})"
        
        household = Household(
            name=h["name"],
            location=location,
            num_people=h["people"],
            num_floors=h["floors"],
            material=h["material"],
            has_elderly=h["elderly"],
            has_children=False,
            has_mobility_issues=False,
            status="validado",
            created_by=1,  # Admin
            validated_by=2  # Coordenador
        )
        db.add(household)
    
    db.commit()
    
    # Criar zonas de risco
    zones = [
        {"name": "Zona Incêndio Norte", "type": "fire_zone", "lat": 39.4750, "lng": -8.2050},
        {"name": "Zona Cheias Sul", "type": "flood_zone", "lat": 39.4670, "lng": -8.1950},
    ]
    
    for z in zones:
        location = f"POINT({z['lng']} {z['lat']})"
        zone = OperationalLayer(
            name=z["name"],
            layer_type=z["type"],
            geometry=location,
            status="ACTIVE",
            created_by=2
        )
        db.add(zone)
    
    db.commit()
    
    print(f"✅ Criados {len(households_data)} agregados em Abrantes")
    print(f"✅ Criados {len(zones)} zonas de risco")
    print(f"✅ Utilizadores: admin@sig-aldeias.pt / Admin123!")
    
    db.close()

if __name__ == "__main__":
    seed_abrantes()