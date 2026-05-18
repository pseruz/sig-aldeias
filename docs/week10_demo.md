# Semana 10: Demonstração Funcional

## Funcionalidades Implementadas

### 1. Exportação de Relatórios
- **Endpoint CSV**: `GET /reports/export/csv`
- **Endpoint PDF**: `GET /reports/export/pdf`
- **Filtros suportados**: material, idosos, crianças, status, bounding box geográfico

### 2. Filtros Avançados
- Combinação múltipla de critérios
- Paginação básica (`limit`/`offset`)
- Resposta otimizada para dashboards

### 3. Interface Web (Bootstrap 5)
- Design responsivo (desktop/mobile)
- Navegação intuitiva
- Integração com Leaflet para mapas

## Como Testar Manualmente

### Pré-requisitos
1. API em execução: `uvicorn src.api.main:app --reload`
2. Utilizador autenticado (obter token via `/auth/login`)

### Teste de Exportação CSV
```bash
curl -X GET "http://localhost:8000/reports/export/csv?status=validado&material=betão" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o teste_export.csv
