# Torque — Sistema de Gestão para Oficina/Funilaria

Sistema web de gestão para oficina/funilaria, com foco em controle financeiro
detalhado (contas a pagar/receber, folha de pagamento com comissões, orçado x
realizado, DRE simplificado). Construído de forma incremental, módulo por
módulo — ver `docs/schema.md` para o schema completo e o status de cada
módulo.

O produto se chama **Torque**. Identidade visual: base grafite industrial
(`#1A1A1D`) + laranja de sinalização (`#FF6B00`) como cor de ação, título em
Oswald (condensada/bold) e corpo em fonte de sistema — ver
`frontend/src/theme.js` para a paleta e os tokens compartilhados por todas as
páginas.

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

## Módulo 5 — Financeiro completo ✅

Módulo mais sensível para o cliente final — três pontos receberam atenção
especial na revisão:

- **Fechamento de folha idempotente.** `fechar_folha` trava a linha da
  folha (`SELECT ... FOR UPDATE`) e confere `status == 'aberto'` antes de
  processar; se já estiver fechada, levanta 400 sem tocar em nada. A soma
  de comissões do período só considera `comissoes.folha_id IS NULL`, e
  cada uma é marcada com `folha_id` ao fechar — não sobra comissão "solta"
  para somar de novo. Provado com chamada dupla sequencial (bloqueada) e
  com duas requisições HTTP concorrentes reais na mesma folha (resultado:
  sempre exatamente 1 sucesso + 1 bloqueio, nunca duas `contas_pagar`).
- **DRE e dashboards batem com dados reais, nunca mockados.** Receita e
  custo de peças vêm de `ordens_servico`/`os_itens_peca`, restritos às OS
  que passaram pela transição para `faturado` no período (reaproveita o
  `calcular_valor_total` do Módulo 4, então a receita do DRE nunca diverge
  do valor mostrado na própria OS). Uma OS cancelada nunca chega a
  `faturado`, então fica de fora por construção — sem precisar de filtro
  extra em cada relatório.
- **Orçado x realizado consulta `contas_pagar` reais** por categoria/mês
  (filtro por `vencimento`), nunca um número calculado à parte. Alerta
  visual a partir de 90% da meta.

Também:

- Contas a Pagar/Receber: lançamento manual (categoria obrigatória — sem
  categoria não salva), listagem com filtro por status, marcar como
  paga/recebida. Status `atrasado` é recalculado a cada listagem
  (vencimento no passado + ainda pendente).
- Folha de Pagamento: abrir → adicionar descontos → fechar (calcula
  salário base + comissões do período − descontos, gera `contas_pagar`
  categoria "Pessoal") → pagar.
- Fluxo de caixa: série diária de entradas/saídas realizadas (por data de
  pagamento/recebimento) e projetadas (por vencimento de pendentes), com
  saldo acumulado a partir de zero no início do período consultado (o
  schema não tem uma tabela de saldo de caixa inicial — documentado como
  simplificação).
- Ponto de equilíbrio = despesas fixas ÷ margem de contribuição % do mês.
- Evolução mensal (6 meses) e despesas por categoria, para os dashboards.
- Despesas fixas do DRE = `contas_pagar` reais (fixa/tributos/
  investimentos) **+** salário base das folhas fechadas no período —
  deliberadamente sem a comissão da folha, que já entra na linha
  "Comissões" do DRE (evita duplicar).
- Restrito inteiramente a `admin`/`financeiro` — nem recepção nem mecânico
  têm acesso a qualquer dado financeiro (testado via API e UI).
- Frontend: Contas a Pagar, Contas a Receber, Folha, Orçado x Realizado
  (barras com linha de meta) e Dashboard (DRE, ponto de equilíbrio,
  evolução mensal, despesas por categoria).
- Seed reaproveitando dados reais dos módulos anteriores: fecha a folha de
  Carlos Mecânico usando a comissão de verdade gerada pela OS #1 do
  Módulo 4, imprime o DRE/orçado x realizado resultante ao final.

## Módulo 6 — Relatórios Gerais ✅

Último módulo do plano original. Não introduz tabelas novas — são consultas
sobre o schema já existente (`app/services/relatorios.py`). Dois pontos
receberam atenção especial na revisão:

- **"Lucro por OS" usa sempre o custo snapshotado.** `custo_pecas` de cada OS
  é somado a partir de `os_itens_peca.custo_unitario` (o custo de compra no
  momento em que a peça foi vendida naquela OS), nunca de `peca.custo_compra`
  (o custo atual, que muda a cada nova entrada de estoque). Provado: uma
  entrada de estoque dobrou o custo de compra de uma peça já usada numa OS
  faturada anteriormente (`R$ 350,00` → `R$ 700,00`) e o lucro daquela OS em
  `lucro-por-os` continuou exatamente igual — a consulta lê o histórico, não
  o presente.
- **"Inadimplência" e "ranking de serviços" excluem OS canceladas, mesma
  construção do DRE (Módulo 5).** Ambos partem da mesma função que já
  restringe a OS que passaram pela transição para `faturado` — e
  cancelamento só é permitido antes dessa transição existir. Provado: uma OS
  com item de serviço lançado foi cancelada antes de faturar; o item continua
  no banco para auditoria, mas nunca aparece no ranking; e como
  `contas_receber` só nasce ao faturar, essa OS nunca pode gerar
  inadimplência.

Também:

- `GET /api/relatorios/faturamento`, `/lucro-por-os` e `/ranking-servicos`
  aceitam `?mes=AAAA-MM` (default: mês corrente); `/inadimplencia` não
  depende de período — lista todas as contas a receber vencidas e não pagas.
- Restrito a `admin`/`financeiro`, mesmo padrão do resto do domínio
  financeiro — confirmado via API (403 com token de recepção) e via UI (link
  oculto, rota bloqueada).
- Frontend: página única com faturamento do mês, tabela de lucro por OS,
  gráfico de barras do ranking de serviços e tabela de inadimplência, com
  seletor de mês.
- Seed dedicado (`seed_relatorios.py`, roda depois de `seed_financeiro`):
  adiciona uma segunda e uma terceira OS faturadas (para o ranking mostrar
  mais de um serviço), retroage o vencimento de uma conta a receber para
  simular um cliente inadimplente, e cria uma quarta OS que recebe item de
  serviço e é cancelada antes de faturar — para o frontend mostrar, lado a
  lado, que ela existe mas nunca entra nos relatórios de faturamento.

O plano original de módulos está completo (Módulos 1–6, todos sobre
FastAPI + PostgreSQL local). O sistema foi então **deployado** (Supabase +
Vercel) e, a pedido do cliente, está em **migração de arquitetura** para
rodar 100% em Vercel + Supabase, sem depender de um host de backend à
parte (Render). Ver seção "Migração para Vercel + Supabase" abaixo para o
estado atual dessa migração — os módulos ainda não migrados continuam
funcionando normalmente sobre o backend FastAPI descrito nas seções
acima.

## Migração para Vercel + Supabase

Reescrita de runtime (Python/FastAPI → Next.js/TypeScript rodando como
funções serverless no Vercel), **não** de regra de negócio — cada módulo
migrado mantém exatamente as mesmas regras já provadas nos Módulos 1–6
acima, só muda onde e como elas rodam. `docs/schema.md` continua sendo a
fonte de verdade do schema (agora hospedado no Supabase, não mais num
Postgres local via Alembic).

Peças novas da arquitetura:

- **Backend**: projeto Next.js 16 (App Router) separado, em
  `oficina-sistema/backend-next/`, deployado como projeto Vercel próprio
  (`oficina-funilaria-api`) — origem diferente do frontend, então a
  autenticação é por **Bearer token** (não cookie). Cada route handler
  valida o token e resolve o perfil chamando `getAuthContext()`
  (`lib/auth.ts`), que nunca confia isoladamente no `user_metadata` do
  JWT — sempre confere a tabela `usuarios` (a mesma que as policies de
  RLS consultam). `proxy.ts` (convenção do Next 16 para o antigo
  `middleware.ts`) cuida só de CORS; autorização de verdade fica em cada
  rota + RLS, como a própria documentação do framework recomenda.
- **Autenticação**: Supabase Auth substitui o JWT customizado. Os 4
  perfis continuam existindo como antes, agora ligados a uma conta real
  do Supabase Auth via `usuarios.auth_user_id`. Login no frontend chama
  `supabase.auth.signInWithPassword()` diretamente; o `access_token`
  resultante é enviado como `Authorization: Bearer` para o backend novo.
- **Autorização**: Row Level Security no Postgres do Supabase assume a
  parte pesada do controle de acesso — todas as 24 tabelas têm RLS
  habilitado, com policies que espelham exatamente a mesma matriz de
  perfis usada pelo `require_role(...)` do FastAPI (ex.: mecânico só lê
  as OS em que está envolvido; recepção não acessa nada do financeiro).
  Lógica de API só entra quando a regra é complexa demais para RLS puro.
- **Estoque**: a baixa concorrente de peça (antes um `SELECT ... FOR
  UPDATE` em Python) foi reimplementada como função Postgres `SECURITY
  DEFINER` (RPC do Supabase) — ver Etapa 4 abaixo.
- **Ordens de Serviço**: criação, itens de peça/serviço, funcionários
  responsáveis, fluxo de status (com cálculo automático de comissão ao
  concluir), cancelamento (com estorno de estoque e zeragem de comissão)
  e faturamento (com geração de parcelas) foram reimplementados como
  funções Postgres `SECURITY DEFINER` — ver Etapa 5 abaixo.
- **Fotos de OS**: passaram de disco local (servido sem autenticação)
  para um bucket privado do Supabase Storage (`os-fotos`), com RLS em
  `storage.objects` espelhando a mesma regra `pode_ver_os()` usada nas
  próprias OS — cada foto é entregue como signed URL de curta duração
  (1h), nunca por um caminho estático público.

### Status por etapa

| Etapa | Escopo | Status |
|---|---|---|
| 1 | Tabelas de perfil + RLS em todas as tabelas | ✅ |
| 2 | Backend Next.js — login, sessão, perfil (4 contas reais validadas) | ✅ |
| 3 | Clientes e Veículos | ✅ |
| 4 | Estoque (com RPC de concorrência) | ✅ |
| 5 | Ordens de Serviço (com upload de fotos no Storage) | ✅ |
| 6 | Financeiro completo | ✅ |
| 7 | Relatórios Gerais | ✅ |

Cada etapa é validada de ponta a ponta (não só "a lógica parece igual")
antes de avançar para a próxima, com deploy no Vercel ao final. Módulos
ainda pendentes continuam servidos pelo backend FastAPI antigo — o
frontend (Vite) fala com os dois backends ao mesmo tempo durante a
transição (`VITE_BACKEND_URL` para o Next.js novo, `VITE_API_URL` para o
FastAPI antigo), migrando página por página conforme cada etapa é
concluída. O backend FastAPI só será removido quando a migração
terminar 100% e for aprovada.

**Nota sobre validação nesta migração**: como o ambiente de execução
usado para construir isto não alcança `*.supabase.co`/`*.vercel.app`
diretamente, a validação de cada etapa é feita contra o deploy real no
Vercel (nunca contra um servidor local), usando a extensão `http` do
Postgres do Supabase como ponte para simular chamadas autenticadas
(incluindo tokens reais emitidos pelo Supabase Auth) direto de dentro da
infraestrutura do Supabase.

**Etapa 4 — concorrência de estoque**: a baixa/ajuste de peça foi
reimplementada como uma função Postgres `SECURITY DEFINER`
(`registrar_movimentacao_estoque`, RPC do Supabase) que trava a linha da
peça com `SELECT ... FOR UPDATE` antes de checar e gravar o novo saldo —
a mesma técnica do `SELECT ... FOR UPDATE` do SQLAlchemy no backend
antigo, agora vivendo dentro do banco (serializa qualquer chamador, não só
o Next.js). Provado com corrida real usando `pg_net` (dispatch assíncrono
direto contra o endpoint REST do Supabase, sem passar pelo Next.js, para
isolar a garantia no nível do banco):
- 2 requisições concorrentes de ajuste, cada uma individualmente válida
  (estoque 10, cada uma pedindo -6) mas conjuntamente inválidas: resultado
  exatamente 1 sucesso + 1 bloqueio (`VALIDATION`), estoque final 4 —
  nunca negativo. A que foi bloqueada só conseguiu rodar sua checagem
  *depois* da outra commitar (viu `atual: 4.00`, não o valor obsoleto
  `10.00`), prova de que o lock serializou as duas transações.
- Repetido com 3 vias (estoque 10, três pedidos de -4 cada): exatamente 2
  sucessos + 1 bloqueio, estoque final 2, com a mesma cadeia de valores
  frescos (10→6→2) confirmando serialização, não só sorte de ordenação.
- Dados de teste e as extensões (`http`, `pg_net`) usadas só para a prova
  foram removidos do banco depois.

**Etapa 5 — Ordens de Serviço**: a baixa de peça pela OS
(`adicionar_item_peca_os`, RPC do Supabase) reusa exatamente a mesma
técnica de lock (`SELECT ... FOR UPDATE` na linha da peça) da Etapa 4, e
foi provada com a mesma rigor de corrida real via `pg_net`, contra o
deploy de produção já corrigido (ver nota abaixo sobre o incidente de
deploy):
- 2 requisições concorrentes em OS diferentes, mesma peça (estoque 10,
  cada uma pedindo -6): exatamente 1 sucesso + 1 bloqueio (`VALIDATION:
  Estoque insuficiente ... disponível: 4.00`), estoque final 4 — a
  bloqueada viu o saldo já atualizado pela vencedora, não o valor obsoleto.
- Repetido com 3 vias contra o saldo restante (estoque 4, três pedidos de
  -2 cada): exatamente 2 sucessos + 1 bloqueio (`disponível: 0.00`),
  estoque final 0, exatamente 1 linha em `os_itens_peca` e 1 em
  `movimentacoes_estoque` por sucesso — nenhuma duplicata, nenhum saldo
  negativo.
- Validação funcional completa também rodada contra produção: fluxo de
  status completo (orçamento→aprovado→em_execução→concluído, incluindo o
  ramo aguardando_peça), comissão calculada automaticamente ao concluir
  (com override por `regras_comissao` e fallback pro percentual padrão do
  funcionário, ambos conferidos), cancelamento com estorno de estoque e
  zeragem de comissão, faturamento com divisão de parcelas (última parcela
  absorve o resto do arredondamento — ex.: R$140,00 em 3x → 46,67 + 46,67 +
  46,66), upload de foto no bucket privado `os-fotos` com o signed URL
  retornado de fato baixando os bytes enviados, geração de PDF de
  orçamento (`%PDF-1.7` válido) e RLS nos 4 perfis (mecânico só vê as OS em
  que está envolvido; recepção e mecânico bloqueados de faturar; acesso a
  `funcionarios` e ao resumo de `clientes`/`veiculos` embutido na OS
  liberado pra todos os perfis autenticados, corrigindo duas policies
  restritivas demais herdadas da Etapa 1). Dados de teste e as extensões
  (`http`, `pg_net`) foram removidos do banco depois.
- **Incidente de deploy identificado e corrigido durante a validação**: o
  primeiro deploy do backend em produção ficou retornando 500 em toda
  rota (`NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são
  obrigatórias`) porque o Next.js embute variáveis `NEXT_PUBLIC_*` em
  **tempo de build**, e o deploy não incluiu o `.env.production` do
  projeto — nenhuma configuração via painel do Vercel resolve valores já
  compilados como `undefined`. Corrigido reincluindo o `.env.production`
  no deploy; confirmado com `GET /api/clientes` e `POST
  /api/ordens-servico` reais retornando 200/201 antes de seguir com a
  prova de concorrência.

**Etapa 6 — Financeiro completo**: o ponto crítico aqui é o fechamento de
folha de pagamento (`fechar_folha`, RPC do Supabase) — a nota original em
`app/services/folha.py` já exigia explicitamente que reprocessar não pode
gerar comissão nem `contas_pagar` duplicada. A técnica é a mesma família
de lock das etapas anteriores (`SELECT ... FOR UPDATE` na linha da
folha), provada com corrida real via `pg_net` contra produção:
- 2 requisições concorrentes tentando fechar a **mesma folha** (com uma
  comissão de R$50 e um desconto de R$300 pendentes de fechamento):
  exatamente 1 sucesso (200, `valor_liquido: 1750`) + 1 bloqueio (400,
  `"Folha já está 'fechado' — fechamento não pode ser reprocessado"`).
  Conferido direto no banco depois: exatamente **1** linha em
  `contas_pagar` (não 2) e a comissão vinculada a **exatamente 1** folha
  (`folha_id` setado uma única vez) — nenhuma duplicata apesar da corrida
  genuína.
- Mesmo padrão testado em `marcar_conta_pagar_paga`/`marcar_conta_receber_recebida`
  (segunda tentativa de pagar/receber a mesma conta bloqueada com 400) e
  `pagar_folha` (só aceita folha `fechado`; conta_pagar vinculada também
  vira `pago` automaticamente).
- Validação funcional completa contra produção: contas a pagar (criar,
  editar — só enquanto pendente/atrasado —, marcar paga, status
  `atrasado` recalculado automaticamente antes de cada listagem), contas
  a receber (marcar recebida), metas de orçamento (unicidade por
  categoria+mês), e os 6 dashboards (DRE, ponto de equilíbrio, evolução
  mensal, orçado x realizado, despesas por categoria, fluxo de caixa) —
  todos com números conferidos manualmente contra os dados reais
  gravados (DRE: receita 7200, custo peças 1950, comissões 90, despesas
  fixas 5875,50, margem 5160, lucro -715,50; ponto de equilíbrio:
  margem 71,67% ⇒ PE R$8.197,99). RLS conferida: recepção bloqueada de
  `/api/financeiro/*`, mecânico bloqueado de `/api/folha` (403 nos dois
  casos).
- **Bug real encontrado e corrigido durante a validação**: as três rotas
  de dashboard que dependem do DRE (`dre`, `ponto-equilibrio`,
  `evolucao-mensal`) devolviam 500 em produção. Causa: a função auxiliar
  `_dre_periodo` referenciava uma CTE (`WITH os_periodo AS (...)`) em
  duas instruções SQL separadas dentro do mesmo corpo da função — CTEs em
  Postgres só existem dentro do statement que as declara, não sobrevivem
  entre instruções diferentes na mesma função `plpgsql`. Corrigido
  substituindo a CTE por um array (`bigint[]`) guardado numa variável,
  reutilizado nas duas queries seguintes. Confirmado chamando a RPC
  diretamente (reproduziu o erro exato `relation "os_periodo" does not
  exist`) antes e depois da correção, e depois via `GET` real nas três
  rotas.
- Dados de teste (funcionário, OS, folha, conta manual, meta) e as
  extensões (`http`, `pg_net`) foram removidos do banco depois.

**Etapa 7 — Relatórios Gerais (última etapa do plano)**: faturamento por
período, lucro por OS, inadimplência de clientes e ranking de serviços,
todos como funções Postgres `SECURITY DEFINER` (`relatorio_faturamento`,
`relatorio_lucro_por_os`, `relatorio_inadimplencia`,
`relatorio_ranking_servicos`), construídos sobre a mesma base de "OS que
passaram por `os_status_log.status_novo = 'faturado'` no período" já usada
pelo DRE da Etapa 6.
- **Requisito 1 — custo de peça snapshotado**: `relatorio_lucro_por_os`
  lê `os_itens_peca.custo_unitario` (gravado no momento da baixa de
  estoque), nunca `pecas.custo_compra` (custo atual). Provado de verdade,
  não só por leitura de código: peguei a OS #14 já faturada
  (`custo_pecas: 80`), forcei `UPDATE pecas SET custo_compra = 999.00`
  na peça usada por ela, chamei `GET /api/relatorios/lucro-por-os` de
  novo em produção — `custo_pecas` continuou `80`, `lucro` continuou
  `340`, sem nenhuma mudança. Valor da peça revertido pra `80.00` depois.
- **Requisito 2 — OS canceladas excluídas por construção**: nenhuma das
  quatro rotas filtra `status <> 'cancelado'` explicitamente — a exclusão
  vem de `cancelar_os` só ser permitida *antes* da transição pra
  `'faturado'` (ver Etapa 5), então uma OS cancelada nunca tem uma linha
  `status_novo = 'faturado'` em `os_status_log` pra entrar no cálculo.
  Confirmado contra a OS #15 (cancelada ainda na Etapa 5, com um item de
  serviço real "Orçamento de funilaria recusado pelo cliente"): seu
  `os_status_log` só tem `orcamento → cancelado` (nunca `faturado`), zero
  linhas em `contas_receber`, e o item dela não aparece no ranking de
  serviços nem ela aparece na inadimplência — apesar de ter um item de
  serviço de verdade no banco.
- Cross-validação entre rotas (mesma disciplina da Etapa 6): a soma de
  `receita` das 3 OS de `relatorio_lucro_por_os` (450+500+950 = 1900)
  bate exatamente com `relatorio_faturamento.valor_total` (1900); soma de
  `custo_pecas` (80+220+350 = 650) e de `comissoes` (30+12+48 = 90) batem
  com os valores corrigidos do DRE (ver bug abaixo).
- RLS/perfil confirmada: `recepcao` e `mecanico` recebem 403 nas 4 rotas;
  `financeiro` recebe 200 em todas.
- Frontend (`Relatorios.jsx`) migrado pro backend novo (`apiNext`) junto
  com esta etapa — verificado indiretamente confirmando que o hash do
  bundle publicado (`index-BWyzL5w4.js`) é **idêntico** ao hash do build
  local a partir do código-fonte já revisado (Vite nomeia os assets pelo
  hash do conteúdo, então hash igual = bytes idênticos, sem precisar
  carregar a página num browser de verdade — o sandbox não alcança
  `*.vercel.app` diretamente).
- Dados de teste (nenhum novo criado — reaproveitada a OS #15 cancelada
  já existente) e as extensões (`http`, `pg_net`) foram removidos do
  banco depois.
- **Bug real retroativo encontrado e corrigido durante esta validação —
  afeta números da Etapa 6 já aprovada**: ao cruzar
  `relatorio_faturamento` contra a soma independente de
  `relatorio_lucro_por_os` pela primeira vez, os totais não batiam (a
  soma de peças/serviços vinha **3× maior** que o valor real — ex.:
  `3240` em vez de `1080`, exatamente 3× o número de OS no período).
  Causa: tanto `_dre_periodo` (Etapa 6) quanto `relatorio_faturamento`
  usavam `unnest(array_de_os_ids) AS os_id` como coluna de um LATERAL
  JOIN, e a subquery correlacionada dentro do LATERAL filtrava com
  `WHERE tabela.os_id = os_id` — como a subquery também tem uma coluna
  chamada `os_id` (`os_itens_peca.os_id`), a regra de resolução de nomes
  do Postgres (escopo mais interno vence) fazia o `os_id` "solto" apontar
  pra coluna da própria subquery, não pro valor externo do `unnest` — a
  condição virava `os_itens_peca.os_id = os_itens_peca.os_id`, sempre
  verdadeira, e cada iteração do LATERAL somava a tabela inteira em vez
  de só os itens da OS da vez. Sem erro nenhum lançado — a query rodava e
  devolvia um número plausível, só errado, por isso não foi pega na
  validação original da Etapa 6 (que não tinha uma segunda fonte
  independente pra cruzar). Corrigido renomeando o alias do `unnest` pra
  `t(alvo_os_id)` (nome que não colide com nenhuma coluna real) e
  qualificando toda referência como `t.alvo_os_id`, nas duas funções.
  **Isso significa que os números de DRE/ponto de equilíbrio/evolução
  mensal mostrados como corretos na aprovação da Etapa 6 (`receita_total:
  7200`) estavam errados — o valor real sempre foi `1900`** (a Etapa 6 só
  tinha 1 OS faturada no período de teste; 3× 1900 ≈ 5700, não bate
  exato com 7200 porque o dado de teste mudou entre as duas validações,
  mas a causa raiz — a mesma ambiguidade de nome — é a mesma). Reconferido
  depois da correção: `dashboard_dre` volta a bater com
  `relatorio_lucro_por_os` (receita 1900, custo peças 650, comissões 90).

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
python -m app.seeds.seed_financeiro
python -m app.seeds.seed_relatorios
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
├── backend/            # FastAPI + SQLAlchemy + Alembic (legado — em migração, ver acima)
│   └── app/
│       ├── core/       # config, database, security, deps (auth/RBAC)
│       ├── models/     # ORM (1 arquivo por domínio, incremental)
│       ├── schemas/    # Pydantic (request/response)
│       ├── routers/    # endpoints por módulo
│       ├── services/   # regras de negócio (baixa de estoque, comissão, etc.)
│       └── seeds/      # dados de teste por módulo
├── backend-next/       # Next.js (App Router) — backend novo, Vercel + Supabase
│   ├── app/api/        # route handlers, 1 por endpoint
│   ├── lib/            # auth.ts (getAuthContext/requirePerfil), supabase.ts
│   └── proxy.ts         # CORS (substitui middleware.ts no Next 16)
├── frontend/           # React (Vite) — fala com os dois backends durante a transição
│   └── src/
│       ├── contexts/
│       ├── services/   # api.js (apiNext + api antigo), supabaseClient.js
│       ├── components/
│       └── pages/
└── docs/
    └── schema.md
```
