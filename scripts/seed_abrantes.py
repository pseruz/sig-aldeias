"""
SIG-Aldeias: Script de Seed para Abrantes
Popula a base de dados com dados de teste realistas para simular uma povoação completa.

Dados incluídos:
- 30 agregados familiares com diferentes tipologias
- 5 edifícios públicos (escola, centro de saúde, igreja, pavilhão, junta)
- 8 bocas de incêndio
- 3 pontos de encontro
- 3 zonas de risco (incêndio, cheias, florestal)
- Dados BIM simulados para edifícios públicos
"""

import sys
import os
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.api.database.connection import SessionLocal, init_database
from src.api.database.models import User, Household, OperationalLayer
from src.api.security.auth import get_password_hash


def seed_abrantes():
    """Cria utilizadores, agregados e infraestruturas na zona de Abrantes"""
    init_database()
    db = SessionLocal()

    # Coordenadas centrais de Abrantes
    ABRANTES_LAT = 39.4706
    ABRANTES_LNG = -8.2003

    # =========================================================================
    # 1. CRIAR UTILIZADORES
    # =========================================================================
    users = [
        User(
            email="admin@sig-aldeias.pt",
            name="Admin Sistema",
            password_hash=get_password_hash("Admin123!"),
            role="admin",
        ),
        User(
            email="coord@sig-aldeias.pt",
            name="Coordenador Mendes",
            password_hash=get_password_hash("Coord123!"),
            role="coordenador",
        ),
        User(
            email="tec@sig-aldeias.pt",
            name="Técnico Silva",
            password_hash=get_password_hash("Tec123!"),
            role="tecnico",
        ),
        User(
            email="operador@sig-aldeias.pt",
            name="Operador Santos",
            password_hash=get_password_hash("Oper123!"),
            role="operador",
        ),
    ]
    db.add_all(users)
    db.commit()

    # =========================================================================
    # 2. AGREGADOS FAMILIARES (30 casas dispersas)
    # =========================================================================
    households_data = [
        # --- ZONA URBANA CENTRO (aglomerado denso) ---
        {"name": "Família Costa", "lat": 39.4710, "lng": -8.2010, "people": 4, "floors": 2, "material": "betão", "elderly": True, "children": False, "mobility": False, "status": "validado"},
        {"name": "Família Santos", "lat": 39.4715, "lng": -8.2005, "people": 3, "floors": 1, "material": "alvenaria", "elderly": False, "children": True, "mobility": False, "status": "validado"},
        {"name": "Família Oliveira", "lat": 39.4705, "lng": -8.2015, "people": 5, "floors": 2, "material": "betão", "elderly": True, "children": True, "mobility": False, "status": "validado"},
        {"name": "Família Ferreira", "lat": 39.4720, "lng": -8.1995, "people": 2, "floors": 1, "material": "madeira", "elderly": True, "children": False, "mobility": True, "status": "pendente"},
        {"name": "Família Silva", "lat": 39.4700, "lng": -8.2020, "people": 6, "floors": 3, "material": "betão", "elderly": False, "children": True, "mobility": False, "status": "validado"},
        {"name": "Família Pereira", "lat": 39.4725, "lng": -8.2000, "people": 3, "floors": 2, "material": "alvenaria", "elderly": True, "children": False, "mobility": True, "status": "validado"},
        {"name": "Família Rodrigues", "lat": 39.4695, "lng": -8.2025, "people": 4, "floors": 1, "material": "madeira", "elderly": False, "children": True, "mobility": False, "status": "pendente"},
        {"name": "Família Martins", "lat": 39.4730, "lng": -8.1990, "people": 2, "floors": 2, "material": "betão", "elderly": True, "children": False, "mobility": False, "status": "validado"},
        
        # --- ZONA RESIDENCIAL NORTE ---
        {"name": "Família Sousa", "lat": 39.4740, "lng": -8.2010, "people": 5, "floors": 2, "material": "alvenaria", "elderly": False, "children": True, "mobility": False, "status": "validado"},
        {"name": "Família Gonçalves", "lat": 39.4745, "lng": -8.1985, "people": 3, "floors": 1, "material": "betão", "elderly": True, "children": False, "mobility": True, "status": "validado"},
        {"name": "Família Lopes", "lat": 39.4750, "lng": -8.2020, "people": 4, "floors": 2, "material": "betão", "elderly": False, "children": True, "mobility": False, "status": "pendente"},
        {"name": "Família Marques", "lat": 39.4755, "lng": -8.1995, "people": 2, "floors": 1, "material": "madeira", "elderly": True, "children": False, "mobility": True, "status": "validado"},
        {"name": "Família Alves", "lat": 39.4760, "lng": -8.2005, "people": 6, "floors": 3, "material": "alvenaria", "elderly": False, "children": True, "mobility": False, "status": "validado"},
        {"name": "Família Nunes", "lat": 39.4765, "lng": -8.2015, "people": 3, "floors": 2, "material": "betão", "elderly": True, "children": True, "mobility": False, "status": "validado"},
        
        # --- ZONA RESIDENCIAL SUL ---
        {"name": "Família Cardoso", "lat": 39.4680, "lng": -8.2040, "people": 4, "floors": 1, "material": "madeira", "elderly": False, "children": True, "mobility": False, "status": "pendente"},
        {"name": "Família Teixeira", "lat": 39.4675, "lng": -8.2030, "people": 5, "floors": 2, "material": "alvenaria", "elderly": True, "children": False, "mobility": True, "status": "validado"},
        {"name": "Família Ribeiro", "lat": 39.4670, "lng": -8.2020, "people": 2, "floors": 1, "material": "betão", "elderly": True, "children": False, "mobility": False, "status": "validado"},
        {"name": "Família Pinto", "lat": 39.4665, "lng": -8.2010, "people": 4, "floors": 2, "material": "betão", "elderly": False, "children": True, "mobility": False, "status": "validado"},
        {"name": "Família Machado", "lat": 39.4660, "lng": -8.2000, "people": 3, "floors": 1, "material": "madeira", "elderly": True, "children": True, "mobility": True, "status": "pendente"},
        {"name": "Família Barbosa", "lat": 39.4655, "lng": -8.1990, "people": 6, "floors": 3, "material": "alvenaria", "elderly": False, "children": True, "mobility": False, "status": "validado"},
        
        # --- ZONA RURAL ESTE ---
        {"name": "Família Carvalho", "lat": 39.4720, "lng": -8.1950, "people": 4, "floors": 1, "material": "alvenaria", "elderly": True, "children": False, "mobility": False, "status": "validado"},
        {"name": "Família Monteiro", "lat": 39.4730, "lng": -8.1940, "people": 3, "floors": 2, "material": "betão", "elderly": False, "children": True, "mobility": False, "status": "pendente"},
        {"name": "Família Correia", "lat": 39.4740, "lng": -8.1930, "people": 5, "floors": 1, "material": "madeira", "elderly": True, "children": True, "mobility": True, "status": "validado"},
        {"name": "Família Moreira", "lat": 39.4750, "lng": -8.1920, "people": 2, "floors": 1, "material": "alvenaria", "elderly": True, "children": False, "mobility": False, "status": "validado"},
        
        # --- ZONA RURAL OESTE ---
        {"name": "Família Fonseca", "lat": 39.4710, "lng": -8.2060, "people": 4, "floors": 2, "material": "betão", "elderly": False, "children": True, "mobility": False, "status": "validado"},
        {"name": "Família Araújo", "lat": 39.4700, "lng": -8.2070, "people": 3, "floors": 1, "material": "madeira", "elderly": True, "children": False, "mobility": True, "status": "pendente"},
        {"name": "Família Mendes", "lat": 39.4690, "lng": -8.2080, "people": 6, "floors": 2, "material": "alvenaria", "elderly": False, "children": True, "mobility": False, "status": "validado"},
        {"name": "Família Duarte", "lat": 39.4680, "lng": -8.2090, "people": 2, "floors": 1, "material": "betão", "elderly": True, "children": False, "mobility": False, "status": "validado"},
        
        # --- ZONA PERIFÉRICA NORDESTE ---
        {"name": "Família Campos", "lat": 39.4770, "lng": -8.1970, "people": 4, "floors": 2, "material": "betão", "elderly": False, "children": True, "mobility": False, "status": "validado"},
        {"name": "Família Vieira", "lat": 39.4780, "lng": -8.1960, "people": 5, "floors": 1, "material": "alvenaria", "elderly": True, "children": True, "mobility": True, "status": "pendente"},
    ]

    for h in households_data:
        location = f"POINT({h['lng']} {h['lat']})"
        household = Household(
            name=h["name"],
            location=location,
            num_people=h["people"],
            num_floors=h["floors"],
            material=h["material"],
            has_elderly=h["elderly"],
            has_children=h["children"],
            has_mobility_issues=h["mobility"],
            status=h["status"],
            created_by=3,  # Técnico
            validated_by=2 if h["status"] == "validado" else None,  # Coordenador
        )
        db.add(household)
    
    db.commit()

    # =========================================================================
    # 3. EDIFÍCIOS PÚBLICOS (com dados BIM simulados)
    # =========================================================================
    public_buildings = [
        {
            "name": "Escola Básica de Abrantes",
            "lat": 39.4735, "lng": -8.2010,
            "floors": 3, "material": "betão",
            "description": "Edifício escolar com 3 pisos, 12 salas de aula"
        },
        {
            "name": "Centro de Saúde de Abrantes",
            "lat": 39.4720, "lng": -8.2025,
            "floors": 2, "material": "betão",
            "description": "Centro de saúde com urgência básica"
        },
        {
            "name": "Igreja Matriz de Abrantes",
            "lat": 39.4715, "lng": -8.2005,
            "floors": 1, "material": "alvenaria",
            "description": "Igreja histórica do século XVI"
        },
        {
            "name": "Pavilhão Municipal",
            "lat": 39.4745, "lng": -8.1995,
            "floors": 1, "material": "betão",
            "description": "Pavilhão desportivo multiusos"
        },
        {
            "name": "Junta de Freguesia",
            "lat": 39.4710, "lng": -8.2015,
            "floors": 2, "material": "alvenaria",
            "description": "Sede da junta de freguesia"
        },
    ]

    for b in public_buildings:
        location = f"POINT({b['lng']} {b['lat']})"
        building = Household(
            name=b["name"],
            location=location,
            num_people=50,  # Capacidade estimada
            num_floors=b["floors"],
            material=b["material"],
            has_elderly=False,
            has_children=True if "Escola" in b["name"] else False,
            has_mobility_issues=True,
            status="validado",
            created_by=1,  # Admin
            validated_by=2,
        )
        db.add(building)
    
    db.commit()

    # =========================================================================
    # 4. BOCA DE INCÊNDIO (8 unidades)
    # =========================================================================
    hydrants = [
        {"name": "Boca Incêndio 01 - Rua Principal", "lat": 39.4712, "lng": -8.2008},
        {"name": "Boca Incêndio 02 - Largo do Município", "lat": 39.4718, "lng": -8.2012},
        {"name": "Boca Incêndio 03 - Rua da Escola", "lat": 39.4738, "lng": -8.2015},
        {"name": "Boca Incêndio 04 - Centro de Saúde", "lat": 39.4722, "lng": -8.2028},
        {"name": "Boca Incêndio 05 - Pavilhão", "lat": 39.4748, "lng": -8.1998},
        {"name": "Boca Incêndio 06 - Zona Sul", "lat": 39.4668, "lng": -8.2015},
        {"name": "Boca Incêndio 07 - Zona Este", "lat": 39.4725, "lng": -8.1945},
        {"name": "Boca Incêndio 08 - Zona Oeste", "lat": 39.4705, "lng": -8.2075},
    ]

    for h in hydrants:
        location = f"POINT({h['lng']} {h['lat']})"
        hydrant = OperationalLayer(
            name=h["name"],
            layer_type="hydrant",
            geometry=location,
            status="ACTIVE",
            created_by=1,
        )
        db.add(hydrant)
    
    db.commit()

    # =========================================================================
    # 5. PONTOS DE ENCONTRO (3 zonas de refúgio)
    # =========================================================================
    meeting_points = [
        {"name": "Ponto de Encontro A - Praça Central", "lat": 39.4715, "lng": -8.2000},
        {"name": "Ponto de Encontro B - Campo de Jogos", "lat": 39.4750, "lng": -8.1990},
        {"name": "Ponto de Encontro C - Parque de Merendas", "lat": 39.4685, "lng": -8.2035},
    ]

    for mp in meeting_points:
        location = f"POINT({mp['lng']} {mp['lat']})"
        point = OperationalLayer(
            name=mp["name"],
            layer_type="meeting_point",
            geometry=location,
            status="ACTIVE",
            created_by=2,
        )
        db.add(point)
    
    db.commit()

    # =========================================================================
    # 6. ZONAS DE RISCO (Incêndio, Cheias, Florestal)
    # =========================================================================
    zones = [
        {
            "name": "Zona Incêndio Norte",
            "type": "fire_zone",
            "lat": 39.4770, "lng": -8.1950,
            "description": "Área de alto risco de incêndio florestal"
        },
        {
            "name": "Zona Cheias Sul - Rio Tejo",
            "type": "flood_zone",
            "lat": 39.4650, "lng": -8.2010,
            "description": "Zona inundável próxima ao rio Tejo"
        },
        {
            "name": "Zona Florestal Este",
            "type": "forest_zone",
            "lat": 39.4735, "lng": -8.1920,
            "description": "Mancha florestal contígua (eucalipto/pinho)"
        },
    ]

    for z in zones:
        location = f"POINT({z['lng']} {z['lat']})"
        zone = OperationalLayer(
            name=z["name"],
            layer_type=z["type"],
            geometry=location,
            status="ACTIVE",
            created_by=2,
        )
        db.add(zone)
    
    db.commit()

    # =========================================================================
    # RESUMO
    # =========================================================================
    print("=" * 60)
    print("✅ SEED ABRANTES CONCLUÍDO COM SUCESSO")
    print("=" * 60)
    print(f"👥 Utilizadores criados: {len(users)}")
    print(f"   - admin@sig-aldeias.pt / Admin123!")
    print(f"   - coord@sig-aldeias.pt / Coord123!")
    print(f"   - tec@sig-aldeias.pt / Tec123!")
    print(f"   - operador@sig-aldeias.pt / Oper123!")
    print(f"🏠 Agregados familiares: {len(households_data)}")
    print(f"🏛️ Edifícios públicos: {len(public_buildings)}")
    print(f"🔥 Bocas de incêndio: {len(hydrants)}")
    print(f"📍 Pontos de encontro: {len(meeting_points)}")
    print(f"️ Zonas de risco: {len(zones)}")
    print("=" * 60)
    print("🎯 Dados prontos para teste e demonstração!")
    print("=" * 60)

    db.close()


if __name__ == "__main__":
    seed_abrantes()