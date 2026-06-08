# Changelog

Todos os lançamentos notáveis deste projeto serão documentados neste ficheiro.
O formato segue as boas práticas de [Keep a Changelog](https://keepachangelog.com/pt/BR/1.0.0/).

## [0.2.2] - 2026-06-08
### Added
- **Dashboard Bento Box:** Layout moderno de 3 colunas (Filtros, Mapa, Validação) com cantos arredondados e design tático escuro.
- **Fichas Técnicas Completas:** Sistema de edição de dados com validação de coordenadas GPS, mini-mapa e geração de QR Code.
- **Gestão de Alertas:** Painel de alertas em tempo real e contadores de Zonas de Risco (Alta, Média, Baixa).
- **Impressão PDF:** Layout otimizado para impressão de fichas técnicas.
- **Placeholders de Fotografia:** Área dedicada para upload de imagens do local no registo e ficha técnica.

### Changed
- **UI/UX Overhaul:** Refatoração completa do `style.css` e `map.html` para suportar o layout "Bento Box" e scroll independente nos painéis laterais.
- **Recuperação de Projeto:** Reestruturação do repositório após incidente de limpeza acidental.

---

## [0.2.1] - 2026-05-18
### Added
- ✅ Núcleo do MVP: Autenticação JWT com controlo de acesso por perfis (admin, técnico, coordenador)
- ✅ CRUD completo de agregados familiares com validação rigorosa via Pydantic v2
- ✅ Módulo de validação de dados por técnicos da Proteção Civil (com justificação obrigatória)
- ✅ Camada de base de dados adaptativa: PostgreSQL/PostGIS (produção) e SQLite (desenvolvimento/testes)
- ✅ Script de inicialização de base de dados (`scripts/init_db.py`)
- ✅ Estrutura de testes unitários preparada (autenticação, criação de registos, validação)

### Changed
- Migração para sintaxe Pydantic v2 (`model_dump` em vez de `dict`)
- `lifespan` da aplicação simplificado para evitar conexões prematuras à base de dados durante testes
- Coluna `location` adaptada para formato WKT (`String(255)`) para garantir compatibilidade imediata entre ambientes

### Known Issues / Limitações
- ⚠️ Testes unitários bloqueados temporariamente por incompatibilidade entre `GeoAlchemy2` e `SQLite` em memória.
  → **Resolução planeada para Semana 11:** Migração para testes de integração com Docker/PostgreSQL.
- ⚠️ Representação espacial ainda em formato texto (WKT). A migração para tipo nativo `Geometry` do PostGIS será feita após configuração do ambiente de produção.

---

## [0.2.0] - 2026-04-01
### Added
- Estrutura completa de pastas com `.gitkeep` para manter diretórios no Git
- Ficheiros essenciais: `requirements.txt`, `.env.example`, `CHANGELOG.md`
- Configuração inicial do repositório GitHub
- Documentação C4 Nível 1
- **Documentação de requisitos com técnica MoSCoW**
- **Diagrama C4 Nível 2**
- **Modelo de dados preliminar (ER Diagram)**

### Checklist (Semanas 3-4: 31 Mar - 11 Abr)
- [x] Levantamento de requisitos baseado na proposta submetida
- [x] Aplicação da técnica MoSCoW aos requisitos
- [x] Elaboração do diagrama C4 nível 2
- [x] Criação do modelo de dados preliminar (ER diagram)
- [ ] Validação com orientador/entidades externas (pendente)

---

## [0.1.0] - 2026-03-25
### Added
- Estrutura inicial do projeto e documentação base
- Configuração do `.gitignore` específico para Python/IDEs
- Submissão da proposta de projeto e alinhamento de âmbito
