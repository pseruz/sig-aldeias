# 🗺️ SIG-Aldeias

**Sistema de Informação Geográfica para Apoio à Proteção Civil em Aldeias Rurais**

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-green.svg)](https://leafletjs.com/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5-purple.svg)](https://getbootstrap.com/)
[![License](https://img.shields.io/badge/License-Academic-yellow.svg)]()

---

## 📋 Descrição

O **SIG-Aldeias** é um sistema web para gestão de informação territorial em aldeias rurais portuguesas, desenvolvido no âmbito do Projeto Final de Engenharia Informática da Universidade Aberta.

O sistema permite:
- 📍 Recolha e validação de dados de agregados familiares com georreferenciação GPS
- 🗺️ Visualização geográfica interativa com filtros, clusters e camadas operacionais
- 🏗️ **Visualização 2.5D isométrica** (efeito maquete) com edifícios volumétricos
- 📄 Fichas técnicas completas com QR Code e edição de coordenadas
- 🚨 Sistema de alertas e zonas de risco em tempo real
- 👥 Gestão de utilizadores com controlo de acesso diferenciado (4 roles)
- 📦 **Importação de dados BIM/GeoJSON** (exportados de Revit, AutoCAD, etc.)
- 📊 Exportação de relatórios e impressão de fichas técnicas
- ℹ️ Página institucional com informação académica e técnica

---

## 🎓 Contexto Académico

| Campo | Informação |
|-------|-----------|
| **Instituição** | Universidade Aberta (UAB) |
| **Curso** | Licenciatura em Engenharia Informática |
| **Tipo** | Projeto Final de Licenciatura |
| **Estudante** | Pedro Cruz (Nº 2003655) |
| **Orientadores** | Prof. Pedro Pestana · Prof. Jorge Trindade |
| **UC** | Projeto de Engenharia Informática |
| **Ano Letivo** | 2025/26 |
| **Versão** | 2.0.1 |
| **Repositório** | https://github.com/pseruz/sig-aldeias |

---

## 🚀 Estado do Projeto

**Fase Atual:** Implementação Avançada (Fase 2.2) — Versão 2.0.1

| Check | Fase | Status | Data |
|-------|------|--------|------|
| ✅ | Proposta de Projeto | Concluído | 25 Mar 2026 |
| ✅ | Levantamento de Requisitos | Concluído | 11 Abr 2026 |
| ✅ | Implementação MVP | Concluído | 18 Mai 2026 |
| ✅ | Layout Bento Box + Fichas Técnicas | Concluído | 08 Jun 2026 |
| ✅ | Visualização 2.5D Isométrica | Concluído | 05 Jul 2026 |
| ✅ | Importação BIM/GeoJSON | Concluído | 05 Jul 2026 |
| ✅ | Página Sobre Institucional | Concluído | 05 Jul 2026 |
| ✅ | Deploy em Render | Concluído | 05 Jul 2026 |
| 📝 | Relatório Final | Em Progresso | 24 Jun 2026 |

---

## 🛠️ Tecnologias

### Backend
- **Python 3.10+** · **FastAPI** · **SQLAlchemy 2.0**
- **Pydantic v2** (validação de dados)
- **SQLite** (desenvolvimento) · PostgreSQL/PostGIS (produção)

### Frontend
- **HTML5** · **CSS3** · **JavaScript ES6+**
- **Bootstrap 5** (UI responsiva)
- **Leaflet.js 1.9.4** (mapas) · **Leaflet.markercluster**
- **Bootstrap Icons** (ícones)

### Segurança
- **JWT** (JSON Web Tokens)
- **bcrypt** (hashing de passwords, cost=12)
- **RBAC** (Role-Based Access Control)
- **CORS** · **Rate Limiting**

### Padrões
- **GeoJSON** (RFC 7946) · **WKT** (OGC) · **REST API**

---

## ✨ Funcionalidades Implementadas

### 🗺️ Dashboard Operacional
- Layout Bento Box moderno (3 colunas: Filtros, Mapa, Validação)
- Mapa interativo com clusters por material de construção
- Legendas flutuantes (materiais e camadas operacionais)
- Painéis redimensionáveis com handles
- Scroll vertical independente nos painéis laterais

### 🏗️ Visualização 2.5D Isométrica (NOVO)
- **Efeito maquete** com edifícios volumétricos
- 3 faces visíveis (telhado + parede sul + parede este)
- Altura proporcional ao número de pisos
- Cores codificadas por material:
  - 🔵 **Betão** (azul)
  - 🔴 **Madeira** (vermelho)
  - 🟡 **Alvenaria** (amarelo)
- Sombras projetadas para efeito 3D realista
- Toggle opcional (desativado por defeito)

### 📦 Importação BIM/GeoJSON (NOVO)
- Upload de ficheiros `.geojson` exportados de Revit, AutoCAD, etc.
- Suporte a pontos e polígonos
- Conversão automática para WKT
- Notificações toast em tempo real
- Dados de exemplo: Estádio Municipal e Hospital de Abrantes

### 📝 Gestão de Agregados
- CRUD completo com validação rigorosa
- Fichas técnicas com edição de coordenadas GPS
- Mini-mapa e QR Code em cada ficha
- Upload de fotografias do local
- Impressão PDF otimizada

### ✅ Sistema de Validação
- Validação de dados por técnicos da Proteção Civil
- Justificação obrigatória para rejeições
- Audit log de todas as alterações
- Sistema de permissões por role

### 🚨 Alertas e Zonas de Risco
- Painel de alertas em tempo real
- Contadores de zonas de risco (Alta, Média, Baixa)
- Camadas operacionais:
  - 🔥 Manchas de incêndio
  - 🌊 Zonas de cheias
  - 🌲 Zonas florestais
  - 🛣️ Rotas de evacuação

### ℹ️ Página Sobre (NOVO)
- Informação académica institucional
- Stack tecnológica documentada
- Autoria e orientadores
- Link para repositório GitHub

---

## 💻 Instalação e Execução Local

### Pré-requisitos
- Python 3.10 ou superior
- pip (gestor de pacotes Python)
- Git

### Passos

1. **Clonar o repositório**
   ```bash
   git clone https://github.com/pseruz/sig-aldeias.git
   cd sig-aldeias
   ```

2. **Criar ambiente virtual**
    ```
    python3 -m venv venv
    source venv/bin/activate  # Linux/Mac
    # ou
    venv\Scripts\activate  # Windows
    ```

3. **Instalar dependências**
    ``` 
    pip install -r requirements.txt
    ``` 

4.  **Popular base de dados com dados de teste**
    ``` 
    python scripts/seed_abrantes.py
    ```
    Este script cria automaticamente:

    4 utilizadores de teste (admin, coordenador, técnico, operador)
    30 agregados familiares na zona de Abrantes
    5 edifícios públicos
    8 bocas de incêndio
    3 pontos de encontro
    3 zonas de risco 
   

5.  **Iniciar servidor**
    ``` 
    python scripts/init_db.py
    python scripts/seed_roles.py
    ```  

6.  **Aceder à aplicação**
    ``` 
    uvicorn src.api.main:app --reload --host 127.0.0.1 --port 8000
    
    ``` 

7.  **Aceder à aplicação**
      ```
      http://127.0.0.1:8000
    Portal Operacional: http://127.0.0.1:8000/
    Mapa Operacional: http://127.0.0.1:8000/map
    Página Sobre: http://127.0.0.1:8000/sobre
    Documentação API: http://127.0.0.1:8000/docs
      ```
    
    ---

    **Credenciais de Teste**
    
    | Role | email | Password |
    |-------|------|--------|
    | Administrador |  | admin123 |
    | Supervisor | supervisor@pc.pt | super123 |
    | Técnico | tecnico@pc.pt | tec123 |

    Através do Render
    | Role | email | Password |
    |-------|------|--------|
    |Administrador |admin@sig-aldeias.pt|Admin123!|
    |Coordenador|coord@sig-aldeias.pt|Coord123!|
    |Técnico|tec@sig-aldeias.pt|Tec123!|
    |Operador|operador@sig-aldeias.pt|Oper123!|

     ---

    ☁️ Deploy Online (Render)
    O projeto está disponível online através do Render, permitindo acesso sem necessidade de instalação local.
    🔗 Acesso Online
    URL de Produção: https://sig-aldeias.onrender.com
    ⚙️ Configuração no Render
    
    O Render está configurado com os seguintes comandos:
    |Comando|Configuração|
    |-------|------|
    |Build Command|pip install -r requirements.txt && python scripts/seed_abrantes.py|
    |Start Command|uvicorn src.api.main:app --host 0.0.0.0 --port $PORT|
     ---
    ⚠️ Notas Importantes sobre o Render

    Primeiro acesso: O serviço gratuito do Render "adormece" após 15 minutos de inatividade. O primeiro acesso pode demorar 30-60 segundos para "acordar" o serviço.
    Base de dados: A BD SQLite é criada automaticamente a cada deploy pelo script seed_abrantes.py. Isto garante que o sistema tem sempre dados de teste disponíveis.
    Dados efémeros: No plano gratuito do Render, o filesystem é efémero. Dados escritos durante a sessão podem ser perdidos após reinício. Para produção, recomenda-se PostgreSQL/PostGIS.
    Credenciais: As credenciais de teste funcionam tanto localmente como online.

     ---
    📦 Dados de Demonstração (BIM/GeoJSON)
    O repositório inclui um ficheiro de exemplo para testar a importação BIM:

    Ficheiro: scripts/abrantes_bim.geojson
    Conteúdo:
        🏟️ Estádio Municipal de Abrantes (3 pisos, polígono)
        🏥 Hospital de Abrantes (5 pisos, polígono)
        🚪 12 saídas de emergência
        🔥 6 bocas de incêndio
        📍 4 pontos de encontro
     ---
    Como importar:

    Login como admin@sig-aldeias.pt
    Aceder ao Mapa Operacional
    No painel esquerdo, secção "Importação BIM / GeoJSON"
    Clicar em "Selecionar Ficheiro .geojson"
    Escolher scripts/abrantes_bim.geojson
    Ativar a Visualização 2.5D para ver volumetria

    **Estrutura do Projeto**
    ```
    sig-aldeias/
    ├── docs/                          # Documentação
    │   ├── requisitos/                # Documentos de requisitos (MoSCoW)
    │   ├── arquitetura/               # Diagramas C4 e modelo ER
    │   ├── wireframes/                # Protótipos de interface
    │   └── relatorio/                 # Relatório académico
    ├── src/                           # Código fonte
    │   ├── api/                       # Backend FastAPI
    │   │   ├── main.py                # Entry point
    │   │   ├── routes/                # Endpoints da API
    │   │   ├── schemas/               # Validação Pydantic
    │   │   ├── database/              # Modelos SQLAlchemy
    │   │   └── security/              # Autenticação JWT + RBAC
    │   └── frontend/                  # Interface web
    │       ├── templates/             # HTML (Jinja2)
    │       │   ├── base.html          # Template base
    │       │   ├── home.html          # Smart Gateway
    │       │   ├── login.html         # Autenticação
    │       │   ├── map.html           # Dashboard operacional
    │       │   ├── ficha.html         # Ficha técnica
    │       │   ├── registo.html       # Registo de agregados
    │       │   ├── reports.html       # Relatórios
    │       │   └── sobre.html         # Página institucional
    │       └── static/                # Recursos estáticos
    │           ├── css/               # Estilos (style.css, map-25d.css)
    │           └── js/                # Lógica (map-logic.js, map-25d.js)
    ├── scripts/                       # Scripts utilitários
    │   ├── seed_abrantes.py           # Popular BD com dados de teste
    │   └── abrantes_bim.geojson       # Dados BIM de exemplo
    ├── data/                          # Base de dados SQLite (não versionada)
    ├── tests/                         # Testes automatizados
    ├── requirements.txt               # Dependências Python
    ├── .gitignore                     # Exclusões do Git
    └── README.md                      # Este ficheiro
    ```

    **Licença**
    
    Este projeto foi desenvolvido para fins académicos no âmbito da Licenciatura em Engenharia Informática da Universidade Aberta.

    **Contacto**
   ``` 
   Pedro Cruz
   Email: 2003655@estudante.uab.pt
   GitHub: https://github.com/pseruz
   ```
