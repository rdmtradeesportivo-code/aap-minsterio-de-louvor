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

## Módulo 3 — Estoque de Peças ✅

Implementado nesta etapa:

- Model, schemas e endpoints de `fornecedores`, `categorias_peca` e `pecas`.
  Consulta liberada para qualquer perfil autenticado (inclusive mecânico,
  que precisa conferir disponibilidade); cadastro/edição restrito a
  `admin`/`financeiro`.
- `estoque_atual` nunca é definido diretamente por create/update de peça —
  só muda através de uma movimentação registrada, em `app/services/estoque.py`
  (regra de negócio: baixa de estoque não pode ser lançada manualmente em
  paralelo). Peça nova sempre começa com estoque 0.
- Movimentação de **entrada** (compra): gera automaticamente um lançamento em
  `contas_pagar` (categoria "Peças e Insumos", criada sob demanda; origem
  `compra_peca`) e atualiza o custo de compra vigente da peça.
- Movimentação de **ajuste** manual: exige motivo, aceita quantidade
  positiva ou negativa, bloqueia (400) se o resultado for estoque negativo.
  "Saída" (consumo em OS) fica para o Módulo 4, vinculada a item de OS.
- Alerta de estoque baixo: `GET /api/pecas?somente_estoque_baixo=true` e
  campo calculado `estoque_baixo` em toda peça retornada.
- Models mínimos do domínio Financeiro (`CategoriaDespesa`, `CentroCusto`,
  `ContaPagar`) entraram já, em `app/models/financeiro.py`, só para viabilizar
  a geração automática de contas a pagar — o restante do Financeiro (contas a
  receber, folha, comissões, orçado x realizado, DRE) é o Módulo 5.
- Frontend: lista de peças com busca de estoque baixo, formulário de criação,
  e registro de entrada/ajuste inline por linha.
- Seed com 2 fornecedores, 4 categorias e 4 peças (uma delas propositalmente
  abaixo do mínimo, para ver o alerta funcionando).

## Módulo 4 — Ordens de Serviço ✅

Implementado nesta etapa, com atenção a três riscos concretos apontados na
revisão do módulo:

- **`valor_total` nunca é uma fonte de verdade solta.** A coluna existe no
  banco (compatibilidade com o schema original), mas a aplicação nunca lê
  nem escreve nela — a API sempre soma os itens (peça + serviço) na hora da
  resposta (`calcular_valor_total`), então não existe caminho para o valor
  desatualizar.
- **Baixa de peça bloqueia com 400 se o estoque for insuficiente** — mesma
  validação do ajuste manual do Módulo 3.
- **Concorrência**: a peça é travada com `SELECT ... FOR UPDATE`
  (`estoque_service.obter_peca_para_mutacao`) antes de checar/decrementar o
  saldo, dentro da mesma transação do item da OS — duas requisições
  concorrentes pedindo mais do que o saldo disponível nunca conseguem
  "passar" as duas na checagem ao mesmo tempo. Provado com um teste de
  corrida real (duas threads HTTP concorrentes, resultado: exatamente 1
  sucesso + 1 bloqueio, estoque final nunca negativo), rodado 3x. O mesmo
  lock foi retroaplicado ao ajuste/entrada do Módulo 3.
- Fluxo de status com máquina de estados explícita (transições inválidas
  bloqueadas com 400) e log auditável (`os_status_log`, quem mudou e quando).
  Faturar é uma ação dedicada (não uma troca de status genérica): valida que
  a OS está `concluido` e tem pelo menos 1 item, gera `contas_receber`
  (com parcelamento opcional) e bloqueia qualquer alteração de item depois.
- Ao concluir, calcula comissão automaticamente por item de serviço com
  responsável definido (regra específica do funcionário tem prioridade
  sobre o percentual padrão dele).
- Remover um item de peça antes do faturamento estorna o estoque via uma
  movimentação `ajuste` com motivo registrado — nunca um `UPDATE` direto.
- Fotos (antes/depois) com upload real, servidas como arquivo estático.
  PDF do orçamento gerado sob demanda (fpdf2).
- RBAC: `recepcao` cria/edita OS; faturar é só `admin`/`financeiro`;
  `mecanico` só enxerga (somente leitura) as OS em que é responsável por
  algum item de serviço ou está em `os_funcionarios` — nunca a lista
  inteira (testado via API e UI).
- Models mínimos de `funcionarios`, `regras_comissao`, `comissoes` e
  `contas_receber` entraram aqui (antes do Módulo 5 completo), mesmo padrão
  já usado no Módulo 3 com `contas_pagar`.
- Frontend: lista de OS com filtro por status, criação com seleção
  cliente→veículo em cascata, detalhe completo (itens, status, faturamento,
  responsáveis, fotos, histórico), download de PDF, e visão restrita do
  mecânico.
- Seed com 2 funcionários (um vinculado ao usuário mecânico de teste) e uma
  OS de exemplo percorrendo o fluxo completo até faturado.

### Gap fechado após a revisão: status "cancelado"

- Migration `0002`: novo valor `cancelado` no CHECK de `ordens_servico.status`
  e coluna `motivo` (nullable) em `os_status_log`.
- Endpoint dedicado `POST /api/ordens-servico/{id}/cancelar` (nunca pela troca
  de status genérica) — permitido em qualquer status anterior a `faturado`;
  depois de faturada, não cancela mais.
- Estoque já baixado é estornado (mesma lógica de remover item; itens
  continuam visíveis na OS cancelada, só para auditoria).
- Comissões já calculadas são zeradas (`valor = 0`, linha mantida).
- Uma OS cancelada nunca passa pela transição para `faturado`, então fica de
  fora por construção de qualquer relatório de faturamento/DRE do Módulo 5.
- Testado via API (bloqueios: cancelar já cancelada, cancelar faturada,
  setar `cancelado` via `/status` genérico, mecânico sem permissão) e via UI.

Próximos módulos (ainda não implementados — apenas o schema já existe no
banco): Financeiro completo (orçado x realizado, fluxo de caixa, DRE,
dashboards) → Relatórios Gerais.

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
python -m app.seeds.seed_estoque
python -m app.seeds.seed_ordens_servico
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
