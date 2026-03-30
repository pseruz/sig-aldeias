# SIG-Aldeias

Sistema de Informação Geográfica para Apoio à Proteção Civil em Aldeias Rurais

## Descrição

O SIG-Aldeias é um sistema web para gestão de informação territorial em aldeias rurais portuguesas, desenvolvido no âmbito do Projeto de Engenharia Informática da Universidade Aberta.

O sistema permite:
- ✅ Recolha e validação de dados de agregados familiares
- ✅ Visualização geográfica interativa com filtros
- ✅ Exportação de relatórios para a Proteção Civil
- ✅ Gestão de utilizadores com controlo de acesso diferenciado

## Estado do Projeto

**Fase Atual:** Proposta Submetida (Semana 1-2)

| Cheek |          Fase            |     tatus    | Data Prevista   |
|-------|--------------------------|--------------|-----------------|
|  ✅  |Proposta de Projeto        | Concluído    | 25 Mar 2026     |
|  ⏳  |Levantamento de Requisitos | Em Progresso | 31 Mar - 11 Abr |
|  ⏳  |Implementação              | Planeado     | 14 Abr - 30 Mai |
|  ⏳  |Relatório Intercalar       | Planeado     | 6 Mai           |
|  ⏳  |Relatório Final            | Planeado     | 24 Jun          |

## Tecnologias

- **Backend:** Python + FastAPI
- **Base de Dados:** PostgreSQL + PostGIS
- **Frontend:** HTML5 + Bootstrap 5 + JavaScript
- **Mapas:** Leaflet + OpenStreetMap
- **Autenticação:** JWT + bcrypt
- **Deploy:** Docker

## Estrutura do Projeto
("
sig-aldeias/
├── docs/ # Documentação
│ ├── requisitos/ # Documentos de requisitos
│ ├── arquitetura/ # Diagramas e decisões
│ ├── wireframes/ # Protótipos de interface
│ └── relatorio/ # Relatório académico
├── src/ # Código fonte
│ ├── api/ # Backend FastAPI
│ └── frontend/ # Interface web
├── tests/ # Testes automatizados
├── scripts/ # Scripts utilitários
├── data/ # Dados simulados
└── database/ # Schema e dados da BD
")
