# SIG-Aldeias

Sistema de Informação Geográfica para Apoio à Proteção Civil em Aldeias Rurais

**Estudante:** Pedro Cruz · 2003655  
**Orientador:** Pedro Pestana  
**UC:** Projeto de Engenharia Informática · Universidade Aberta · 2025/26  
**Repositório:** https://github.com/pseruz/sig-aldeias

---

## Descrição

O SIG-Aldeias é um sistema web para gestão de informação territorial em aldeias rurais portuguesas, desenvolvido no âmbito do Projeto de Engenharia Informática da Universidade Aberta.

O sistema permite:
- Recolha e validação de dados de agregados familiares
- Visualização geográfica interativa com filtros e clusters
- Fichas técnicas completas com edição de coordenadas GPS
- Sistema de alertas e zonas de risco em tempo real
- Gestão de utilizadores com controlo de acesso diferenciado (3 roles)
- Exportação de relatórios e impressão de fichas técnicas
- QR Code para acesso rápido às fichas

---

## Estado do Projeto

**Fase Atual:** Implementação Avançada (Fase 2.2)

| Check | Fase | Status | Data |
|-------|------|--------|------|
| ✅ | Proposta de Projeto | Concluído | 25 Mar 2026 |
| ✅ | Levantamento de Requisitos | Concluído | 11 Abr 2026 |
| ✅ | Implementação MVP | Concluído | 18 Mai 2026 |
| ✅ | Layout Bento Box + Fichas Técnicas | Concluído | 08 Jun 2026 |
| ⏳ | Relatório Final | Em Progresso | 24 Jun 2026 |

---

## Tecnologias

- **Backend:** Python 3.10+ · FastAPI · SQLAlchemy
- **Base de Dados:** SQLite (desenvolvimento) · PostgreSQL/PostGIS (produção)
- **Frontend:** HTML5 · CSS3 · JavaScript · Bootstrap 5
- **Mapas:** Leaflet · OpenStreetMap · MarkerCluster
- **Autenticação:** JWT · PBKDF2-SHA256
- **Segurança:** Validação Pydantic v2 · CORS · Rate Limiting

---

## Funcionalidades Implementadas

### Dashboard Operacional
- Layout Bento Box moderno (3 colunas: Filtros, Mapa, Validação)
- Mapa interativo com clusters por material de construção
- Legendas flutuantes (materiais e camadas operacionais)
- Painéis redimensionáveis com handles
- Scroll vertical independente nos painéis laterais

### Gestão de Agregados
- CRUD completo com validação rigorosa
- Fichas técnicas com edição de coordenadas GPS
- Mini-mapa e QR Code em cada ficha
- Upload de fotografias do local
- Impressão PDF otimizada

### Sistema de Validação
- Validação de dados por técnicos da Proteção Civil
- Justificação obrigatória para rejeições
- Audit log de todas as alterações
- Sistema de permissões por role

### Alertas e Zonas de Risco
- Painel de alertas em tempo real
- Contadores de zonas de risco (Alta, Média, Baixa)
- Camadas operacionais (incêndios, cheias, floresta, rotas de evacuação)

---

## Instalação e Execução

### Pré-requisitos
- Python 3.10 ou superior
- pip (gestor de pacotes Python)

### Passos

1. **Clonar o repositório**
   ```bash
   git clone https://github.com/pseruz/sig-aldeias.git
   cd sig-aldeias

2. **Criar ambiente virtual**
    python3 -m venv venv
    source venv/bin/activate  # Linux/Mac
    # ou
    venv\Scripts\activate  # Windows

4. **Instalar dependências**
    pip install -r requirements.txt

5.  **Iniciar servidor**
     python scripts/init_db.py
     python scripts/seed_roles.py

6.  **Aceder à aplicação**
     uvicorn src.api.main:app --reload --host 127.0.0.1 --port 8000

7.  **Aceder à aplicação**
     http://127.0.0.1:8000
    
    ---

    **Credenciais de Teste**
    | Role | email | Password |
    |-------|------|--------|
    | Administrador | admin@pc.pt | admin123 |
    | Supervisor | supervisor@pc.pt | super123 |
    | Técnico | tecnico@pc.pt | tec123 |

    ---

    **Estrutura do Projeto**
    sig-aldeias/
    ├── docs/                    # Documentação
    │   ├── requisitos/          # Documentos de requisitos (MoSCoW)
    │   ├── arquitetura/         # Diagramas C4 e modelo ER
    │   ├── wireframes/          # Protótipos de interface
    │   └── relatorio/           # Relatório académico
    ├── src/                     # Código fonte
    │   ├── api/                 # Backend FastAPI
    │   │   ├── routes/          # Endpoints da API
    │   │   ├── schemas/         # Validação Pydantic
    │   │   ├── database/        # Modelos SQLAlchemy
    │   │   └── security/        # Autenticação JWT
    │   └── frontend/            # Interface web
    │       ├── templates/       # HTML (Jinja2)
    │       └── static/          # CSS, JS, imagens
    ├── tests/                   # Testes automatizados
    ├── scripts/                 # Scripts utilitários
    ├── data/                    # Base de dados SQLite
    ├── requirements.txt         # Dependências Python
    └── README.md               # Este ficheiro

    **Licença**
    Este projeto foi desenvolvido para fins académicos no âmbito da Licenciatura em Engenharia Informática da Universidade Aberta.

    **Contacto**
   Pedro Cruz
   Email: 2003655@estudante.uab.pt
   GitHub: https://github.com/pseruz
