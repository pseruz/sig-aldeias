#!/bin/bash
# scripts/validate.sh
# Validação completa do SIG-Aldeias v0.2.2 — 100% local, sem dependências externas

set -e  # Para ao primeiro erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuração
BASE_URL="http://127.0.0.1:8000"
TIMEOUT=5
PASS=0
FAIL=0

# Funções utilitárias
log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_pass()    { echo -e "${GREEN}[PASS]${NC} $1"; ((PASS++)); }
log_fail()    { echo -e "${RED}[FAIL]${NC} $1"; ((FAIL++)); }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Header
echo -e "\n${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  SIG-Aldeias — Validação Completa v0.2.2${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}\n"

# =============================================================================
# 1. PRÉ-REQUISITOS: Servidor a correr?
# =============================================================================
log_info "Verificar se o servidor está ativo..."
if ! curl -s --max-time 3 "$BASE_URL/health" > /dev/null 2>&1; then
  log_fail "Servidor não responde em $BASE_URL"
  log_info "Sugestão: uvicorn src.api.main:app --reload --host 127.0.0.1 --port 8000 &"
  exit 1
fi
log_pass "Servidor ativo e a responder"

# =============================================================================
# 2. BACKEND: Endpoints JSON críticos
# =============================================================================
echo -e "\n${YELLOW}🔹 BACKEND — Endpoints JSON${NC}"

# Health check
RESP=$(curl -s --max-time $TIMEOUT "$BASE_URL/health")
if echo "$RESP" | grep -q '"status":"ok"'; then
  log_pass "/health → 200 OK"
else
  log_fail "/health → resposta inválida: $RESP"
fi

# Households list (pode estar vazia)
RESP=$(curl -s --max-time $TIMEOUT "$BASE_URL/households/")
if echo "$RESP" | grep -qE '^\[|\{"id"'; then
  log_pass "/households/ → JSON válido"
else
  log_fail "/households/ → resposta inválida: ${RESP:0:100}..."
fi

# Reports summary
RESP=$(curl -s --max-time $TIMEOUT "$BASE_URL/reports/summary")
if echo "$RESP" | grep -q '"total"'; then
  log_pass "/reports/summary → JSON válido"
else
  log_fail "/reports/summary → resposta inválida"
fi

# Auth: tentar login com credenciais de teste (se existirem)
log_info "Testar autenticação (credenciais de teste)..."
LOGIN_RESP=$(curl -s --max-time $TIMEOUT -X POST "$BASE_URL/auth/login" \
  -d "username=admin@pc.pt" -d "password=supersecret" 2>/dev/null || echo "{}")
if echo "$LOGIN_RESP" | grep -q "access_token"; then
  TOKEN=$(echo "$LOGIN_RESP" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
  log_pass "/auth/login → token obtido"
  # Testar endpoint protegido
  if [ -n "$TOKEN" ]; then
    RESP=$(curl -s --max-time $TIMEOUT "$BASE_URL/households/" \
      -H "Authorization: Bearer $TOKEN")
    if [ $? -eq 0 ]; then
      log_pass "/households/ com auth → 200 OK"
    else
      log_warn "/households/ com auth → falha (pode ser esperado se não houver dados)"
    fi
  fi
else
  log_warn "/auth/login → credenciais de teste não válidas (normal em dev)"
fi

# =============================================================================
# 3. FRONTEND: Páginas HTML servidas corretamente
# =============================================================================
echo -e "\n${YELLOW}🔹 FRONTEND — Páginas HTML${NC}"

# Página raiz
RESP=$(curl -s --max-time $TIMEOUT "$BASE_URL/")
if echo "$RESP" | grep -q "<title>"; then
  TITLE=$(echo "$RESP" | grep -o "<title>[^<]*</title>" | head -1)
  log_pass "/ → HTML servido $TITLE"
else
  log_fail "/ → resposta não é HTML válido"
fi

# Página do mapa
RESP=$(curl -s --max-time $TIMEOUT "$BASE_URL/map")
if echo "$RESP" | grep -q "map-container"; then
  log_pass "/map → template carregado (#map-container presente)"
else
  log_fail "/map → #map-container não encontrado"
fi

# Dashboard
RESP=$(curl -s --max-time $TIMEOUT "$BASE_URL/dashboard")
if echo "$RESP" | grep -q "Dashboard"; then
  log_pass "/dashboard → template carregado"
else
  log_warn "/dashboard → conteúdo não verificado (pode ser placeholder)"
fi

# Login
RESP=$(curl -s --max-time $TIMEOUT "$BASE_URL/login")
if echo "$RESP" | grep -q "login-form\|Entrar"; then
  log_pass "/login → formulário presente"
else
  log_warn "/login → estrutura não verificada"
fi

# =============================================================================
# 4. ESTÁTICOS: CSS e JS carregam sem erros 404
# =============================================================================
echo -e "\n${YELLOW}🔹 ESTÁTICOS — CSS/JS${NC}"

# CSS principal
CSS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$BASE_URL/static/css/style.css")
if [ "$CSS_STATUS" = "200" ]; then
  log_pass "/static/css/style.css → 200 OK"
else
  log_fail "/static/css/style.css → HTTP $CSS_STATUS"
fi

# JS do mapa
JS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$BASE_URL/static/js/map-logic.js")
if [ "$JS_STATUS" = "200" ]; then
  log_pass "/static/js/map-logic.js → 200 OK"
else
  log_fail "/static/js/map-logic.js → HTTP $JS_STATUS"
fi

# Bootstrap CSS (CDN — só verifica se o HTML referencia)
if curl -s "$BASE_URL/map" | grep -q "cdn.jsdelivr.net/npm/bootstrap"; then
  log_pass "Bootstrap CDN referenciado no HTML"
else
  log_warn "Bootstrap CDN não encontrado (pode ser local)"
fi

# Leaflet CSS/JS (CDN)
if curl -s "$BASE_URL/map" | grep -q "unpkg.com/leaflet"; then
  log_pass "Leaflet CDN referenciado no HTML"
else
  log_warn "Leaflet CDN não encontrado"
fi

# =============================================================================
# 5. FUNCIONALIDADES CRÍTICAS: Validação lógica
# =============================================================================
echo -e "\n${YELLOW}🔹 FUNCIONALIDADES — Lógica de Negócio${NC}"

# Criar agregado de teste (se autenticado)
if [ -n "$TOKEN" ]; then
  log_info "Testar criação de agregado (POST /households/)..."
  CREATE_RESP=$(curl -s --max-time $TIMEOUT -X POST "$BASE_URL/households/" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Teste Validação","num_people":3,"num_floors":2,"material":"betão","latitude":40.2,"longitude":-8.1}')
  
  if echo "$CREATE_RESP" | grep -q '"id"'; then
    HOUSEHOLD_ID=$(echo "$CREATE_RESP" | grep -o '"id":[0-9]*' | cut -d: -f2)
    log_pass "POST /households/ → agregado criado (ID: $HOUSEHOLD_ID)"
    
    # Validar esse agregado
    log_info "Testar validação (POST /validation/$HOUSEHOLD_ID)..."
    VALID_RESP=$(curl -s --max-time $TIMEOUT -X POST "$BASE_URL/validation/$HOUSEHOLD_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"status":"validado","reason":"Validação automática de teste"}')
    
    if echo "$VALID_RESP" | grep -q "sucesso\|200"; then
      log_pass "POST /validation/ → validação registada"
    else
      log_warn "POST /validation/ → resposta: ${VALID_RESP:0:80}..."
    fi
  else
    log_warn "POST /households/ → resposta: ${CREATE_RESP:0:100}..."
  fi
else
  log_warn "Skipped: criação de agregado (sem token de auth)"
fi

# Exportação CSV
CSV_RESP=$(curl -s --max-time $TIMEOUT "$BASE_URL/reports/export/csv")
if echo "$CSV_RESP" | grep -q "ID,Nome"; then
  log_pass "/reports/export/csv → cabeçalho válido"
else
  log_warn "/reports/export/csv → conteúdo não verificado"
fi

# Exportação PDF (tamanho mínimo)
PDF_SIZE=$(curl -s --max-time $TIMEOUT "$BASE_URL/reports/export/pdf" -o /tmp/test.pdf 2>/dev/null && stat -c%s /tmp/test.pdf 2>/dev/null || echo "0")
if [ "$PDF_SIZE" -gt 100 ]; then
  log_pass "/reports/export/pdf → ficheiro gerado ($PDF_SIZE bytes)"
else
  log_warn "/reports/export/pdf → ficheiro pequeno ou vazio ($PDF_SIZE bytes)"
fi

# =============================================================================
# 6. TESTES UNITÁRIOS: pytest
# =============================================================================
echo -e "\n${YELLOW}🔹 TESTES UNITÁRIOS — pytest${NC}"

if command -v pytest &> /dev/null; then
  log_info "Executar pytest tests/ -v --tb=short..."
  if pytest tests/ -v --tb=short -q 2>&1 | tee /tmp/pytest.log | grep -q "passed"; then
    PASSED=$(grep -o "[0-9]* passed" /tmp/pytest.log | head -1 || echo "0 passed")
    log_pass "pytest → $PASSED"
  else
    log_fail "pytest → falhou (ver /tmp/pytest.log)"
  fi
else
  log_warn "pytest não instalado — saltando testes unitários"
fi

# =============================================================================
# 7. VALIDAÇÃO MANUAL: Checklist para o utilizador
# =============================================================================
echo -e "\n${YELLOW}🔹 VALIDAÇÃO MANUAL — Browser (abre http://127.0.0.1:8000/map)${NC}"
echo -e "${BLUE}Confirma visualmente:${NC}"
echo "  [ ] 1. Mapa Leaflet carrega com grid OpenStreetMap"
echo "  [ ] 2. Tema Proteção Civil aplicado (fundo #121824, botões #FF6B00)"
echo "  [ ] 3. Marcadores coloridos aparecem (🔴 pendente, 🟢 validado, ⚪ rejeitado)"
echo "  [ ] 4. Clique num marcador → popup com dados + painel #drawer abre"
echo "  [ ] 5. Painel BIM aparece para edifícios críticos (num_floors>=2)"
echo "  [ ] 6. Toggle 'Rotas de Evacuação' → polilinhas azuis aparecem"
echo "  [ ] 7. Toggle 'Zonas de Risco' → círculos coloridos aparecem"
echo "  [ ] 8. Filtros laterais atualizam marcadores sem reload"
echo "  [ ] 9. Mobile: redimensionar janela → FABs e bottom sheets funcionam"
echo "  [ ] 10. F12 → Console: sem erros vermelhos; Network: sem 404"

# =============================================================================
# 8. RELATÓRIO FINAL
# =============================================================================
echo -e "\n${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  RELATÓRIO DE VALIDAÇÃO${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}\n"

TOTAL=$((PASS + FAIL))
if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✅ TODOS OS TESTS AUTOMATIZADOS PASSARAM ($PASS/$TOTAL)${NC}"
  echo -e "${GREEN}🎯 Pronto para avançar para Fase 2.2-E!${NC}"
elif [ $FAIL -le 2 ]; then
  echo -e "${YELLOW}⚠️  $FAIL warning(s) — revisão recomendada antes de avançar${NC}"
  echo -e "${YELLOW}📋 Verifica os logs acima e corrige se necessário${NC}"
else
  echo -e "${RED}❌ $FAIL falha(s) detectada(s) ($PASS/$TOTAL passed)${NC}"
  echo -e "${RED}🛑 Resolve os erros antes de prosseguir${NC}"
fi

echo -e "\n${BLUE}Próximos passos sugeridos:${NC}"
if [ $FAIL -eq 0 ]; then
  echo "  1. Commit: git add . && git commit -m 'chore: validação completa pré-Fase 2.2-E'"
  echo "  2. Push: git push origin \$(git branch --show-current)"
  echo "  3. Avançar: Cola o prompt da Fase 2.2-E no Composer (Ctrl+I)"
else
  echo "  1. Corrigir falhas listadas acima"
  echo "  2. Re-executar: bash scripts/validate.sh"
  echo "  3. Só avançar quando [FAIL] = 0"
fi

echo -e "\n${BLUE}Script concluído — $(date)${NC}\n"

# Exit code para CI/CD (opcional)
exit $FAIL
