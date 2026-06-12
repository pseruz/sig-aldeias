#!/usr/bin/env python3
"""Importa dados simulados de BIM/Revit (GeoJSON) para a base de dados."""
import sys
import os

# Adicionar o diretório raiz ao sys.path para encontrar o módulo 'src'
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.api.database.connection import SessionLocal
from src.api.database.models import OperationalLayer

# Simula um ficheiro GeoJSON exportado de um modelo BIM/Revit da aldeia
bim_export_simulation = {
  "type": "FeatureCollection",
  "features": [
    # --- Infraestruturas Técnicas ---
    {
      "type": "Feature",
      "properties": {"name": "Boca de Incêndio 01", "type": "hydrant", "pressure": "8bar", "guid_revit": "BIM-HYD-001"},
      "geometry": {"type": "Point", "coordinates": [-8.0550, 40.2150]}
    },
    {
      "type": "Feature",
      "properties": {"name": "Boca de Incêndio 02", "type": "hydrant", "pressure": "6bar", "guid_revit": "BIM-HYD-002"},
      "geometry": {"type": "Point", "coordinates": [-8.0520, 40.2180]}
    },
    {
      "type": "Feature",
      "properties": {"name": "Ponto de Encontro - Escola", "type": "meeting_point", "capacity": 150, "guid_revit": "BIM-MP-001"},
      "geometry": {"type": "Point", "coordinates": [-8.0530, 40.2170]}
    },
    {
      "type": "Feature",
      "properties": {"name": "Ponto de Encontro - Campo Futebol", "type": "meeting_point", "capacity": 300, "guid_revit": "BIM-MP-002"},
      "geometry": {"type": "Point", "coordinates": [-8.0510, 40.2190]}
    },
    
    # --- Edifícios Públicos ---
    {
      "type": "Feature",
      "properties": {
        "name": "Junta de Freguesia", 
        "type": "public_building", 
        "subtype": "parish_council", 
        "capacity": 50, 
        "has_generator": True,
        "guid_revit": "BIM-PUB-001"
      },
      "geometry": {"type": "Point", "coordinates": [-8.0540, 40.2160]}
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Escola Primária da Aldeia", 
        "type": "public_building", 
        "subtype": "school", 
        "capacity": 120, 
        "has_shelter": True,
        "guid_revit": "BIM-PUB-002"
      },
      "geometry": {"type": "Point", "coordinates": [-8.0530, 40.2170]}
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Centro de Saúde", 
        "type": "public_building", 
        "subtype": "health_center", 
        "capacity": 30, 
        "has_generator": True,
        "guid_revit": "BIM-PUB-003"
      },
      "geometry": {"type": "Point", "coordinates": [-8.0525, 40.2165]}
    }
  ]
}

def import_bim_simulation():
    db = SessionLocal()
    try:
        for feature in bim_export_simulation["features"]:
            coords = feature["geometry"]["coordinates"]
            
            # WKT segue a ordem X (Longitude) e Y (Latitude)
            wkt = f"POINT({coords[0]} {coords[1]})" 
            
            props = feature["properties"]
            
            # Cria o objeto para a base de dados
            infra = OperationalLayer(
                name=props["name"],
                layer_type=props["type"],
                geometry=wkt,
                description=f"Subtipo: {props.get('subtype', 'N/A')} | Capacidade: {props.get('capacity', 'N/A')} | GUID Revit: {props.get('guid_revit')}",
                status="ACTIVE"
            )
            db.add(infra)
            
        db.commit()
        print("================================================================")
        print("✅ Dados BIM importados com sucesso (Incluindo Edifícios Públicos)!")
        print(f"   Total: {len(bim_export_simulation['features'])} infraestruturas")
        print("================================================================")
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao importar dados BIM: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    import_bim_simulation()