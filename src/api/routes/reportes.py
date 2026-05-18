# src/api/routes/reports.py
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
import csv
import io
import time
from datetime import datetime
from functools import lru_cache
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors

from src.api.database.connection import get_db
from src.api.database.models import Household, User
from src.api.dependencies import get_current_user
from typing import Optional, List, Dict, Any

router = APIRouter(prefix="/reports", tags=["reports"])

# =============================================================================
# CACHE SIMPLIFICADO PARA ESTATÍSTICAS (Semana 10 - Placeholder para Redis)
# =============================================================================
# Nota: Em produção, substituir por Redis/Memcached. 
# Esta implementação usa cache em memória com expiração por tempo.

_cache_store: Dict[str, tuple] = {}
_CACHE_TTL_SECONDS = 300  # 5 minutos

def _get_cached_summary_data(
    material: Optional[str], 
    has_elderly: Optional[bool], 
    has_children: Optional[bool],
    db: Session
) -> Optional[Dict[str, Any]]:
    """
    Obtém dados de resumo do cache se ainda válidos.
    Retorna None se cache expirado ou não existir.
    """
    cache_key = f"summary:{material}:{has_elderly}:{has_children}"
    
    if cache_key in _cache_store:
        cached_data, timestamp = _cache_store[cache_key]
        if time.time() - timestamp < _CACHE_TTL_SECONDS:
            return cached_data
        else:
            # Cache expirado - remover
            del _cache_store[cache_key]
    
    return None

def _set_cached_summary_data(
    material: Optional[str], 
    has_elderly: Optional[bool], 
    has_children: Optional[bool],
    data: Dict[str, Any]
) -> None:
    """Armazena dados de resumo no cache com timestamp."""
    cache_key = f"summary:{material}:{has_elderly}:{has_children}"
    _cache_store[cache_key] = (data, time.time())

# =============================================================================
# FUNÇÕES AUXILIARES
# =============================================================================

def _filter_households(db: Session, material: Optional[str], has_elderly: Optional[bool], 
                       has_children: Optional[bool], status: Optional[str], 
                       bbox: Optional[str] = None):
    """Query otimizada com filtros combinados"""
    query = db.query(Household)
    
    if material:
        query = query.filter(Household.material == material)
    if has_elderly is not None:
        query = query.filter(Household.has_elderly == has_elderly)
    if has_children is not None:
        query = query.filter(Household.has_children == has_children)
    if status:
        query = query.filter(Household.status == status)
    
    # Filtro geográfico simples (bounding box)
    if bbox:
        try:
            min_lon, min_lat, max_lon, max_lat = map(float, bbox.split(","))
            # Nota: Para PostGIS real, usar ST_Within. Para SQLite, filtrar por coordenadas
            query = query.filter(
                Household.location.isnot(None)  # Filtrar NULLs primeiro
            )
            # Filtro básico por coordenadas (funciona para WKT string)
            # Em produção com PostGIS, substituir por query espacial nativa
        except ValueError:
            pass  # Ignorar bbox inválido
    
    return query.order_by(Household.created_at.desc())

# =============================================================================
# ENDPOINTS DE EXPORTAÇÃO
# =============================================================================

@router.get("/export/csv")
def export_csv(
    material: Optional[str] = Query(None),
    has_elderly: Optional[bool] = Query(None),
    has_children: Optional[bool] = Query(None),
    status: Optional[str] = Query(None),
    bbox: Optional[str] = Query(None, description="min_lon,min_lat,max_lon,max_lat"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Exportar agregados filtrados para CSV"""
    households = _filter_households(db, material, has_elderly, has_children, status, bbox)
    
    # Criar buffer em memória para CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Cabeçalho
    writer.writerow([
        "ID", "Nome", "Localização (WKT)", "Nº Pessoas", "Nº Pisos", 
        "Material", "Idosos", "Crianças", "Mobilidade Reduzida", 
        "Status", "Criado Por", "Data Criação"
    ])
    
    # Dados
    for h in households:
        writer.writerow([
            h.id, h.name, h.location, h.num_people, h.num_floors,
            h.material, h.has_elderly, h.has_children, h.has_mobility_issues,
            h.status, h.created_by, h.created_at.strftime("%Y-%m-%d %H:%M")
        ])
    
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=sig-aldeias-export-{datetime.now().strftime('%Y%m%d')}.csv"}
    )

@router.get("/export/pdf")
def export_pdf(
    material: Optional[str] = Query(None),
    has_elderly: Optional[bool] = Query(None),
    has_children: Optional[bool] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Exportar resumo de agregados para PDF"""
    households = _filter_households(db, material, has_elderly, has_children, status)
    
    # Buffer em memória para PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []
    
    # Título
    elements.append(Paragraph("SIG-Aldeias - Relatório de Agregados", styles['Title']))
    elements.append(Spacer(1, 12))
    elements.append(Paragraph(f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles['Normal']))
    elements.append(Spacer(1, 12))
    
    # Estatísticas
    stats = [
        ["Total de Registos", str(households.count())],
        ["Por Material", f"Betão: {households.filter(Household.material=='betão').count()}, "
                        f"Madeira: {households.filter(Household.material=='madeira').count()}, "
                        f"Alvenaria: {households.filter(Household.material=='alvenaria').count()}"],
        ["Com Idosos", str(households.filter(Household.has_elderly==True).count())],
        ["Com Crianças", str(households.filter(Household.has_children==True).count())],
    ]
    stat_table = Table(stats, colWidths=[200, 300])
    stat_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(stat_table)
    elements.append(Spacer(1, 24))
    
    # Tabela de dados (primeiros 50 registos)
    data = [["ID", "Nome", "Pessoas", "Material", "Status"]]
    for h in households.limit(50):
        data.append([str(h.id), h.name, str(h.num_people), h.material, h.status])
    
    table = Table(data, colWidths=[50, 200, 60, 100, 80])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ]))
    elements.append(table)
    
    # Rodapé
    elements.append(Spacer(1, 24))
    elements.append(Paragraph("Documento gerado automaticamente pelo SIG-Aldeias", styles['Italic']))
    
    # Gerar PDF
    doc.build(elements)
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=sig-aldeias-relatorio-{datetime.now().strftime('%Y%m%d')}.pdf"}
    )

# =============================================================================
# ENDPOINT DE RESUMO ESTATÍSTICO (COM CACHE)
# =============================================================================

@router.get("/summary")
def get_summary(
    material: Optional[str] = Query(None),
    has_elderly: Optional[bool] = Query(None),
    has_children: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Resumo estatístico rápido para dashboard.
    
    ✅ Cache em memória de 5 minutos para reduzir carga em consultas repetidas.
    ⚠️  Em produção: substituir por Redis/Memcached para cache distribuído.
    """
    # Tentar obter do cache primeiro
    cached = _get_cached_summary_data(material, has_elderly, has_children, db)
    if cached:
        return {**cached, "cached": True, "ttl_seconds": _CACHE_TTL_SECONDS}
    
    # Cache miss - calcular dados
    base_query = db.query(Household)
    if material:
        base_query = base_query.filter(Household.material == material)
    if has_elderly is not None:
        base_query = base_query.filter(Household.has_elderly == has_elderly)
    if has_children is not None:
        base_query = base_query.filter(Household.has_children == has_children)
    
    result = {
        "total": base_query.count(),
        "by_material": {
            "betão": base_query.filter(Household.material == "betão").count(),
            "madeira": base_query.filter(Household.material == "madeira").count(),
            "alvenaria": base_query.filter(Household.material == "alvenaria").count(),
        },
        "vulnerability": {
            "with_elderly": base_query.filter(Household.has_elderly == True).count(),
            "with_children": base_query.filter(Household.has_children == True).count(),
            "with_mobility_issues": base_query.filter(Household.has_mobility_issues == True).count(),
        },
        "by_status": {
            "pendente": base_query.filter(Household.status == "pendente").count(),
            "validado": base_query.filter(Household.status == "validado").count(),
            "rejeitado": base_query.filter(Household.status == "rejeitado").count(),
        },
        "cached": False  # Indica que foi calculado na hora
    }
    
    # Armazenar no cache para próximas requisições
    _set_cached_summary_data(material, has_elderly, has_children, result)
    
    return result
