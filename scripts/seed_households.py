#!/usr/bin/env python3
"""Cria agregados familiares simulados para testes."""
import sys
import os
import random

# Adicionar o diretório raiz ao sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.api.database.connection import SessionLocal
from src.api.database.models import User, Household

# Coordenadas realistas (zona de Arganil/Serra da Estrela)
COORDS_BASE = {
    "lat": 40.2165,
    "lng": -8.0535
}

# Dados simulados de agregados
HOUSEHOLDS_DATA = [
    # Agregados com idosos (risco médio/alto)
    {
        "name": "Família Silva",
        "num_people": 3,
        "num_floors": 1,
        "material": "madeira",
        "has_elderly": True,
        "has_children": False,
        "has_mobility_issues": True,
        "status": "pendente",
        "lat_offset": 0.0010,
        "lng_offset": -0.0015
    },
    {
        "name": "Família Santos",
        "num_people": 2,
        "num_floors": 1,
        "material": "alvenaria",
        "has_elderly": True,
        "has_children": False,
        "has_mobility_issues": False,
        "status": "validado",
        "lat_offset": 0.0015,
        "lng_offset": -0.0010
    },
    {
        "name": "Família Costa",
        "num_people": 4,
        "num_floors": 2,
        "material": "betão",
        "has_elderly": True,
        "has_children": True,
        "has_mobility_issues": False,
        "status": "pendente",
        "lat_offset": 0.0020,
        "lng_offset": -0.0005
    },
    # Agregados com crianças
    {
        "name": "Família Ferreira",
        "num_people": 5,
        "num_floors": 2,
        "material": "alvenaria",
        "has_elderly": False,
        "has_children": True,
        "has_mobility_issues": False,
        "status": "validado",
        "lat_offset": 0.0005,
        "lng_offset": -0.0020
    },
    {
        "name": "Família Oliveira",
        "num_people": 6,
        "num_floors": 2,
        "material": "betão",
        "has_elderly": False,
        "has_children": True,
        "has_mobility_issues": False,
        "status": "pendente",
        "lat_offset": 0.0012,
        "lng_offset": -0.0025
    },
    # Agregados de madeira (risco elevado em incêndios)
    {
        "name": "Família Rodrigues",
        "num_people": 2,
        "num_floors": 1,
        "material": "madeira",
        "has_elderly": False,
        "has_children": False,
        "has_mobility_issues": False,
        "status": "pendente",
        "lat_offset": 0.0025,
        "lng_offset": -0.0012
    },
    {
        "name": "Família Pereira",
        "num_people": 3,
        "num_floors": 1,
        "material": "madeira",
        "has_elderly": True,
        "has_children": False,
        "has_mobility_issues": True,
        "status": "pendente",
        "lat_offset": 0.0018,
        "lng_offset": -0.0018
    },
    # Agregados de betão (mais seguros)
    {
        "name": "Família Martins",
        "num_people": 4,
        "num_floors": 3,
        "material": "betão",
        "has_elderly": False,
        "has_children": True,
        "has_mobility_issues": False,
        "status": "validado",
        "lat_offset": 0.0008,
        "lng_offset": -0.0008
    },
    {
        "name": "Família Sousa",
        "num_people": 3,
        "num_floors": 2,
        "material": "betão",
        "has_elderly": False,
        "has_children": False,
        "has_mobility_issues": False,
        "status": "validado",
        "lat_offset": 0.0022,
        "lng_offset": -0.0020
    },
    # Agregados com mobilidade reduzida
    {
        "name": "Família Almeida",
        "num_people": 2,
        "num_floors": 1,
        "material": "alvenaria",
        "has_elderly": True,
        "has_children": False,
        "has_mobility_issues": True,
        "status": "pendente",
        "lat_offset": 0.0015,
        "lng_offset": -0.0002
    },
    {
        "name": "Família Carvalho",
        "num_people": 1,
        "num_floors": 1,
        "material": "alvenaria",
        "has_elderly": True,
        "has_children": False,
        "has_mobility_issues": True,
        "status": "rejeitado",
        "rejection_reason": "Coordenadas GPS inválidas. Contactar técnico para verificação.",
        "lat_offset": 0.0003,
        "lng_offset": -0.0012
    },
    # Mais agregados variados
    {
        "name": "Família Lopes",
        "num_people": 7,
        "num_floors": 2,
        "material": "betão",
        "has_elderly": True,
        "has_children": True,
        "has_mobility_issues": False,
        "status": "validado",
        "lat_offset": 0.0028,
        "lng_offset": -0.0008
    },
    {
        "name": "Família Gonçalves",
        "num_people": 3,
        "num_floors": 1,
        "material": "alvenaria",
        "has_elderly": False,
        "has_children": True,
        "has_mobility_issues": False,
        "status": "pendente",
        "lat_offset": 0.0010,
        "lng_offset": -0.0030
    },
    {
        "name": "Família Ribeiro",
        "num_people": 4,
        "num_floors": 2,
        "material": "madeira",
        "has_elderly": False,
        "has_children": False,
        "has_mobility_issues": False,
        "status": "pendente",
        "lat_offset": 0.0020,
        "lng_offset": -0.0028
    },
    {
        "name": "Família Neves",
        "num_people": 2,
        "num_floors": 1,
        "material": "alvenaria",
        "has_elderly": False,
        "has_children": False,
        "has_mobility_issues": False,
        "status": "validado",
        "lat_offset": 0.0005,
        "lng_offset": -0.0005
    }
]

def seed_households():
    db = SessionLocal()
    
    try:
        # Obter o utilizador técnico (ou admin) para criar os agregados
        user = db.query(User).filter(User.role == "tecnico").first()
        if not user:
            user = db.query(User).filter(User.role == "admin").first()
        
        if not user:
            print("❌ Erro: Nenhum utilizador técnico ou admin encontrado.")
            print("   Executa primeiro: python3 scripts/seed_roles.py")
            return
        
        print(f"👤 A usar utilizador: {user.email} ({user.role})")
        
        # Criar agregados
        for i, data in enumerate(HOUSEHOLDS_DATA, 1):
            # Calcular coordenadas realistas
            lat = COORDS_BASE["lat"] + data["lat_offset"]
            lng = COORDS_BASE["lng"] + data["lng_offset"]
            
            # Criar localização em formato WKT
            location_wkt = f"POINT({lng} {lat})"
            
            # Criar infraestruturas simuladas (JSON)
            infrastructures = {
                "emergency_doors": {
                    "status": "exists" if data["num_floors"] >= 2 else "na",
                    "lat": lat + 0.0001,
                    "lng": lng + 0.0001
                },
                "fire_hydrants": {
                    "status": "exists" if random.random() > 0.3 else "na",
                    "lat": lat + 0.0002,
                    "lng": lng - 0.0001
                },
                "meeting_point": {
                    "status": "exists",
                    "lat": COORDS_BASE["lat"] + 0.0010,
                    "lng": COORDS_BASE["lng"] - 0.0010
                }
            }
            
            # ✅ CORREÇÃO: Usar apenas o campo 'location' (WKT)
            household = Household(
                name=data["name"],
                location=location_wkt,  # Apenas este campo para coordenadas
                num_people=data["num_people"],
                num_floors=data["num_floors"],
                material=data["material"],
                has_elderly=data["has_elderly"],
                has_children=data["has_children"],
                has_mobility_issues=data["has_mobility_issues"],
                status=data["status"],
                rejection_reason=data.get("rejection_reason"),
                created_by=user.id,
                validated_by=user.id if data["status"] == "validado" else None,
                infrastructures=infrastructures
            )
            
            db.add(household)
            
            status_icon = "✓" if data["status"] == "validado" else "⏳" if data["status"] == "pendente" else "✗"
            print(f"{status_icon} {i}. {data['name']} - {data['material']} ({data['num_people']} pessoas)")
        
        db.commit()
        
        print("\n" + "="*60)
        print(f"✅ {len(HOUSEHOLDS_DATA)} agregados familiares criados com sucesso!")
        print("="*60)
        print("\n📊 Resumo:")
        print(f"   • Válidados: {sum(1 for h in HOUSEHOLDS_DATA if h['status'] == 'validado')}")
        print(f"   • Pendentes: {sum(1 for h in HOUSEHOLDS_DATA if h['status'] == 'pendente')}")
        print(f"   • Rejeitados: {sum(1 for h in HOUSEHOLDS_DATA if h['status'] == 'rejeitado')}")
        print(f"\n🗺️  Abre o mapa: http://127.0.0.1:8000/map")
        print(f"🔐 Login: admin@pc.pt / admin123")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Erro ao criar agregados: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_households()