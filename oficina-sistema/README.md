# Sistema de Gestão para Oficina/Funilaria

Sistema web de gestão para oficina/funilaria, com foco em controle financeiro
detalhado (contas a pagar/receber, folha de pagamento com comissões, orçado x
realizado, DRE simplificado). Construído de forma incremental, módulo por
módulo — ver `docs/schema.md` para o schema completo e o status de cada
módulo.

Stack: **FastAPI + SQLAlchemy 2.0 + Alembic + PostgreSQL** no backend,
**React (Vite)** no frontend, autenticação por **JWT** com controle de
permissões por perfil (`admin`, `financeiro`, `recepcao`, `mecanico`).

> Este projeto vive isolado em `oficina-sistema/` dentro do repositório —
> não interfere com o app Next.js de ministério de louvor que já existia
> na raiz do repositório.

## Módulo 1 — Usuários e Autenticação ✅

Implementado nesta etapa:

- Schema completo do banco (todas as tabelas de todos os módulos, ver
  `docs/schema.md`), aplicado por uma única migration inicial do Alembic.
- Model, schemas Pydantic e endpoints de `usuarios` (CRUD restrito a Admin).
- Login com e-mail/senha (`POST /api/auth/login`, formato OAuth2 password
  flow), retorna JWT. Endpoint `GET /api/auth/me` para validar sessão.
- Dependências de autorização (`get_current_user`, `require_role(...)`) para
  proteger rotas por perfil.
- Frontend: tela de login, `AuthContext` (guarda o token, injeta no axios,
  revalida a sessão), rota protegida e painel simples mostrando o usuário
  logado.
- Seed de teste com um usuário por perfil.

## Módulo 2 — Clientes e Veículos ✅

Implementado nesta etapa:

- Model, schemas Pydantic e endpoints de `clientes` e `veiculos`, com
  validação de CPF/CNPJ e placa únicos (409 em duplicata) e checagem de
  cliente existente ao cadastrar um veículo (404 se não existir).
- Acesso restrito a `admin`, `financeiro` e `recepcao` (regra: "Recepção só
  cria/edita OS e clientes"; `mecanico` não enxerga este módulo — testado via
  API, 403, e via UI, rota bloqueada e link oculto na navegação).
- `GET /api/clientes/{id}` retorna o cliente com os veículos aninhados;
  `GET /api/clientes/{id}/veiculos` lista separadamente.
- Frontend: lista de clientes com busca, formulário de criação inline,
  página de detalhe do cliente com cadastro de veículos.
- Seed de teste com 3 clientes e 4 veículos.

Próximos módulos (ainda não implementados — apenas o schema já existe no
banco): Estoque de Peças → Ordens de Serviço → Financeiro completo →
Relatórios.

## Como rodar (Docker Compose — recomendado)

```bash
cd oficina-sistema
docker compose up --build
```

Isso sobe Postgres, aplica as migrations, semeia os usuários de teste e sobe
a API e o frontend. Acesse:

- Frontend: http://localhost:5173
- API (docs interativas): http://localhost:8000/docs

### Credenciais de teste (seed)

Todos com a senha `oficina123`:

| E-mail | Perfil |
|---|---|
| admin@oficina.com | admin |
| financeiro@oficina.com | financeiro |
| recepcao@oficina.com | recepcao |
| mecanico@oficina.com | mecanico |

## Como rodar sem Docker

**Backend**

```bash
cd oficina-sistema/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # ajuste DATABASE_URL para seu Postgres local
alembic upgrade head
python -m app.seeds.seed_usuarios
python -m app.seeds.seed_clientes
uvicorn app.main:app --reload
```

**Frontend**

```bash
cd oficina-sistema/frontend
cp .env.example .env
npm install
npm run dev
```

Depois, das outras estações da rede local, acesse
`http://IP-DO-SERVIDOR:5173` (frontend) — configure `VITE_API_URL` para
apontar para `http://IP-DO-SERVIDOR:8000`.

## Estrutura de pastas

Ver árvore completa e schema do banco em [`docs/schema.md`](./docs/schema.md).

```
oficina-sistema/
├── docker-compose.yml
├── backend/            # FastAPI + SQLAlchemy + Alembic
│   └── app/
│       ├── core/       # config, database, security, deps (auth/RBAC)
│       ├── models/     # ORM (1 arquivo por domínio, incremental)
│       ├── schemas/    # Pydantic (request/response)
│       ├── routers/    # endpoints por módulo
│       ├── services/   # regras de negócio (baixa de estoque, comissão, etc.)
│       └── seeds/      # dados de teste por módulo
├── frontend/           # React (Vite)
│   └── src/
│       ├── contexts/
│       ├── services/
│       ├── components/
│       └── pages/
└── docs/
    └── schema.md
```
