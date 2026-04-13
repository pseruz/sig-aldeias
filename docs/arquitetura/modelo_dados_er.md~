# Modelo de Dados Preliminar - SIG-Aldeias

## Entidades Principais

### users
- id (PK)
- email (UNIQUE)
- password_hash
- name
- role (admin/tecnico/coordenador)
- created_at
- last_login

### households
- id (PK)
- name
- location (GEOMETRY POINT)
- num_people
- num_floors
- material (betão/madeira/alvenaria)
- has_elderly (BOOLEAN)
- has_children (BOOLEAN)
- has_mobility_issues (BOOLEAN)
- status (pendente/validado/rejeitado)
- rejection_reason
- created_by (FK → users.id)
- validated_by (FK → users.id)
- created_at
- validated_at

### access_logs
- id (PK)
- user_id (FK → users.id)
- household_id (FK → households.id)
- action
- ip_address
- created_at

## Relacionamentos
- Um utilizador pode criar múltiplos agregados familiares (1:N)
- Um técnico pode validar múltiplos agregados (1:N)
- Cada operação é registada em access_logs (1:N)