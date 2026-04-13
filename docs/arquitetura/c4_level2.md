# Diagrama C4 Nível 2 - SIG-Aldeias

## Containers

### Web Application
- **Tecnologia:** HTML5 + Bootstrap 5 + JavaScript (Vanilla)
- **Responsabilidades:**
  - Renderizar interface do utilizador
  - Gerir interações com o mapa Leaflet
  - Validar inputs do utilizador
  - Comunicar com a API FastAPI

### API FastAPI
- **Tecnologia:** Python + FastAPI
- **Responsabilidades:**
  - Autenticação JWT
  - Gestão de utilizadores
  - CRUD de agregados familiares
  - Validação de dados
  - Queries geoespaciais
  - Exportação de relatórios
  - Logs de segurança

### Base de Dados
- **Tecnologia:** PostgreSQL + PostGIS
- **Responsabilidades:**
  - Armazenar dados de utilizadores
  - Armazenar dados de agregados familiares
  - Armazenar logs de acesso
  - Executar queries espaciais

## Relacionamentos
- Web Application → API FastAPI (HTTP/JSON)
- API FastAPI → Base de Dados (SQL)
- Web Application → OpenStreetMap (tiles de mapa)