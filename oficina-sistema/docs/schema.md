# Schema do banco de dados — Sistema de Gestão para Oficina/Funilaria

> Documento de referência, versionado junto do código. Espelha o schema aplicado
> pelas migrations do Alembic (`backend/alembic/versions/`). Qualquer alteração
> de schema deve atualizar este arquivo junto com a migration correspondente.

Convenções: `id` é `BIGSERIAL PRIMARY KEY` em todas as tabelas; `criado_em`/`atualizado_em`
são `TIMESTAMPTZ DEFAULT now()`; enums são `VARCHAR` com `CHECK` (mais simples de alterar
que `ENUM` nativo do Postgres ao longo do projeto).

> **Migração para Supabase (em andamento, ver README):** o mesmo schema abaixo agora
> vive no Postgres do Supabase, com duas adições sobre a migration original do Alembic
> (aplicadas via `apply_migration` do Supabase, não via Alembic): a coluna
> `usuarios.auth_user_id` (uuid, FK para `auth.users`, liga cada usuário a uma conta real
> do Supabase Auth) e Row Level Security habilitado em todas as 24 tabelas, com policies
> que espelham a mesma matriz de perfis (`admin`/`financeiro`/`recepcao`/`mecanico`) já
> documentada abaixo em cada módulo. Alembic continua sendo a fonte de verdade para quem
> roda o `backend/` FastAPI local (Docker Compose); o Supabase é a fonte de verdade do
> ambiente deployado.

## 1. Usuários e Permissões — ✅ implementado (Módulo 1)

**usuarios**
| coluna | tipo | observação |
|---|---|---|
| id | bigserial PK | |
| nome | varchar | |
| email | varchar unique | login |
| senha_hash | varchar | bcrypt |
| perfil | varchar | CHECK IN ('admin','financeiro','recepcao','mecanico') |
| ativo | boolean default true | |
| criado_em | timestamptz | |
| auth_user_id | uuid unique, FK auth.users, nullable | só existe no Supabase (ver nota de migração acima); liga o usuário à conta real do Supabase Auth |

## 2. Clientes e Veículos — ✅ implementado (Módulo 2)

**clientes**: id, nome, telefone, email, cpf_cnpj (unique), endereco, criado_em

**veiculos**: id, cliente_id → clientes, placa (unique), modelo, marca, ano, cor, km_atual, criado_em

> Histórico de serviços por veículo (todas as OS já feitas naquele carro) fica
> pendente até o Módulo 4 (Ordens de Serviço) existir — a rota será
> adicionada em `veiculos.py` quando houver dado para mostrar.

## 3. Estoque de Peças — ✅ implementado (Módulo 3)

**fornecedores**: id, nome, telefone, email, cnpj, endereco

**categorias_peca**: id, nome (funilaria, pintura, elétrica, etc.)

**pecas**: id, codigo (unique), descricao, categoria_id → categorias_peca, fornecedor_id → fornecedores,
unidade_medida, custo_compra numeric(12,2), preco_venda numeric(12,2), estoque_minimo numeric,
estoque_atual numeric, criado_em

**movimentacoes_estoque**: id, peca_id → pecas, tipo CHECK IN ('entrada','saida','ajuste'), quantidade numeric,
motivo varchar, os_id → ordens_servico (nullable, preenchido quando é saída por consumo em OS),
usuario_id → usuarios, conta_pagar_id → contas_pagar (nullable, preenchido quando é entrada por compra),
observacao, criado_em

> Regra: entrada gera `contas_pagar` automaticamente; saída só ocorre vinculada a item de OS
> (nunca lançamento solto); ajuste manual exige motivo.

> Implementado: `estoque_atual` só muda por movimentação (nunca é campo editável em
> create/update de peça — `app/services/estoque.py` é o único lugar que altera). "saida"
> fica para o Módulo 4 (só existe vinculada a item de OS). Entrada gera automaticamente um
> `contas_pagar` (categoria "Peças e Insumos", get-or-create) — por isso os models mínimos
> de Financeiro (`CategoriaDespesa`, `CentroCusto`, `ContaPagar`) já existem em
> `app/models/financeiro.py`, ampliados quando o Módulo 5 chegar. Relatórios de estoque
> (peças mais usadas, giro, curva ABC) ficam para o Módulo 6 (Relatórios Gerais); por ora só
> existe o alerta de estoque baixo (`GET /api/pecas?somente_estoque_baixo=true`).

## 4. Ordens de Serviço — ✅ implementado (Módulo 4)

**ordens_servico**: id, numero (sequencial, unique), cliente_id → clientes, veiculo_id → veiculos,
status varchar CHECK IN ('orcamento','aprovado','em_execucao','aguardando_peca','concluido','faturado','pago','cancelado')
*(`cancelado` adicionado na migration 0002 — ver nota de implementação abaixo)*,
data_abertura, prazo_estimado date, forma_pagamento varchar, valor_total numeric(12,2),
criado_por → usuarios, criado_em, atualizado_em

**os_itens_peca**: id, os_id → ordens_servico, peca_id → pecas, quantidade numeric,
preco_unitario_venda numeric(12,2), custo_unitario numeric(12,2) *(snapshot do custo no momento —
histórico não muda se o custo da peça mudar depois)*

**os_itens_servico**: id, os_id → ordens_servico, descricao, valor numeric(12,2),
funcionario_id → funcionarios *(responsável, para comissão)*

**os_funcionarios**: id, os_id → ordens_servico, funcionario_id → funcionarios, papel varchar
*(ex: funileiro, pintor — permite mais de um responsável por OS)*

**os_fotos**: id, os_id → ordens_servico, tipo CHECK IN ('antes','depois'), caminho_arquivo, criado_em

**os_status_log**: id, os_id → ordens_servico, status_anterior, status_novo, usuario_id → usuarios,
data_hora, motivo varchar nullable *(auditoria obrigatória a cada mudança de status; `motivo` — coluna
adicionada na migration 0002 — só é preenchido no cancelamento)*

> Regra: faturar só é permitido se todo item de peça/serviço estiver preenchido (validação de
> serviço, não de schema). Faturar gera `contas_receber`. Concluir dispara cálculo de `comissoes`.

> Implementado — três decisões deliberadas na revisão do módulo:
> - **`valor_total` nunca é lido da coluna do banco.** A coluna existe (compatibilidade com o
>   schema original), mas a aplicação nunca escreve nem lê nela — a API sempre soma
>   `os_itens_peca` + `os_itens_servico` na hora da resposta
>   (`app/services/ordem_servico.py::calcular_valor_total`), então não existe caminho para o
>   valor desatualizar.
> - **Baixa de peça (`saida`) trava a linha da peça (`SELECT ... FOR UPDATE`)** antes de checar
>   e decrementar o estoque (`estoque_service.obter_peca_para_mutacao`, reaproveitado do Módulo
>   3), bloqueando com 400 se o saldo for insuficiente. Duas requisições concorrentes pedindo
>   mais do que o saldo disponível: a segunda espera a primeira commitar e então vê o saldo já
>   atualizado — nunca as duas passam na checagem ao mesmo tempo. Provado com teste de corrida
>   real (duas threads, HTTP concorrente) rodado 3x.
> - A OS bloqueia alteração de itens depois de faturada (`faturado`/`pago`); remover um item de
>   peça antes disso estorna o estoque via uma movimentação `ajuste` com motivo registrado
>   (nunca um `UPDATE` direto em `estoque_atual`).
>
> `funcionarios`, `regras_comissao`, `comissoes` e `contas_receber` ganharam ORM mínimo aqui
> (antes do Módulo 5 completo) porque a própria regra de negócio deste módulo depende deles —
> mesmo padrão já usado no Módulo 3 com `contas_pagar`.
>
> **Cancelamento** (migration 0002, endpoint dedicado `POST .../cancelar`, nunca pela troca de
> status genérica): permitido em qualquer status anterior a `faturado` — depois de faturada, a
> OS não cancela mais (só existiria estorno/nota de crédito, fora de escopo). Ao cancelar:
> estoque já baixado é estornado (mesma lógica de remover item, mas os itens continuam visíveis
> na OS para auditoria) e comissões já calculadas são zeradas (`valor = 0`, linha mantida para
> auditoria). Uma OS cancelada nunca passa pela transição para `faturado`, então fica de fora
> por construção de qualquer relatório de faturamento/DRE que só considere OS que atingiram
> esse estado (ver Módulo 5).

## 5. Financeiro — ✅ implementado (Módulo 5)

**categorias_despesa**: id, nome, tipo varchar CHECK IN ('fixa','variavel','pessoal','tributos','investimentos')

**centros_custo**: id, nome CHECK IN ('funilaria','pintura','mecanica','administrativo')

**contas_pagar**: id, fornecedor_id → fornecedores (nullable), descricao,
categoria_id → categorias_despesa **NOT NULL** *(regra: sem categoria não salva)*,
centro_custo_id → centros_custo (nullable), valor numeric(12,2), vencimento date,
status varchar CHECK IN ('pendente','pago','atrasado'), data_pagamento date nullable,
origem varchar CHECK IN ('manual','compra_peca','folha'), criado_em

**contas_receber**: id, cliente_id → clientes, os_id → ordens_servico, descricao, valor numeric(12,2),
vencimento date, status varchar CHECK IN ('pendente','recebido','atrasado'), data_recebimento date nullable,
numero_parcela int, total_parcelas int, criado_em

**funcionarios**: id, usuario_id → usuarios (nullable — nem todo funcionário precisa de login), nome,
cargo, salario_base numeric(12,2), percentual_comissao_padrao numeric(5,2), ativo boolean, data_admissao date

**regras_comissao**: id, funcionario_id → funcionarios (nullable = regra geral),
categoria_peca_id → categorias_peca (nullable = aplica a todo serviço), percentual numeric(5,2)
*(permite variar comissão por tipo de serviço/funcionário)*

**comissoes**: id, os_id → ordens_servico, funcionario_id → funcionarios, valor numeric(12,2),
percentual_aplicado numeric(5,2), data_calculo, folha_id → folha_pagamento (nullable até o
fechamento mensal incluir essa comissão)

**folha_pagamento**: id, funcionario_id → funcionarios, mes_referencia date *(primeiro dia do mês)*,
salario_base numeric(12,2), total_comissoes numeric(12,2), total_descontos numeric(12,2),
valor_liquido numeric(12,2), status varchar CHECK IN ('aberto','fechado','pago'), data_fechamento,
conta_pagar_id → contas_pagar (nullable, preenchida ao fechar — categoria "Pessoal")

**folha_descontos**: id, folha_id → folha_pagamento, descricao *(adiantamento, vale, etc.)*, valor numeric(12,2)

**metas_orcamento**: id, categoria_id → categorias_despesa, mes_referencia date,
valor_meta numeric(12,2) *(único por categoria+mês)*

> Implementado — pontos deliberados na revisão do módulo:
> - **Fechamento de folha idempotente.** `fechar_folha` trava a linha da folha (`SELECT ...
>   FOR UPDATE`) e confere `status == 'aberto'` antes de processar; se já estiver
>   `fechado`/`pago`, levanta 400 sem tocar em nada. A soma de comissões do período só
>   considera `comissoes.folha_id IS NULL`, e cada uma é marcada com `folha_id` ao fechar —
>   então não há comissão "solta" para somar de novo. Provado com chamada dupla sequencial
>   (bloqueada) e com duas requisições HTTP concorrentes na mesma folha (exatamente 1 sucesso +
>   1 bloqueio, nunca duas `contas_pagar`).
> - **DRE e dashboards usam dados reais**, nunca mockados: receita e custo de peças vêm de
>   `ordens_servico`/`os_itens_peca`, restritos às OS que passaram pela transição para
>   `faturado` (`os_status_log`) no período — o mesmo `calcular_valor_total` do Módulo 4 é
>   reaproveitado, então a receita do DRE nunca diverge do valor mostrado na própria OS. Uma OS
>   cancelada nunca chega a `faturado`, então fica de fora por construção. Comissões vêm de
>   `comissoes.valor` (já zerado pelo cancelamento, se for o caso).
> - **Despesas fixas do DRE** = `contas_pagar` reais nas categorias fixa/tributos/investimentos
>   (por vencimento) **+** o `salario_base` das folhas fechadas no período — deliberadamente
>   sem a comissão da folha, que já foi contada na linha "Comissões" (evita duplicar).
> - **Orçado x realizado** consulta `contas_pagar` reais por categoria/mês (`vencimento` dentro
>   do mês), nunca um número calculado à parte; alerta visual a partir de 90% da meta.
> - **Fluxo de caixa**: série diária com entradas/saídas realizadas (por
>   data_pagamento/data_recebimento) e projetadas (por vencimento de pendentes/atrasados),
>   saldo acumulado a partir de zero no início do período consultado (o schema não tem uma
>   tabela de saldo de caixa inicial).
> - **Ponto de equilíbrio** = despesas fixas ÷ margem de contribuição %, do DRE do mês.

## 6. Relatórios Gerais — ✅ implementado (Módulo 6)

Não introduz tabelas novas — são apenas consultas sobre o schema já existente
(`ordens_servico`, `os_itens_peca`, `os_itens_servico`, `os_status_log`, `comissoes`,
`contas_receber`). Quatro relatórios, todos em `app/services/relatorios.py`:

- **Faturamento por período**: quantidade e valor total das OS que passaram pela transição
  para `faturado` dentro do intervalo.
- **Lucro por OS**: receita (`calcular_valor_total`) − custo de peças − comissões, por OS
  faturada no período, ordenado da mais recente para a mais antiga.
- **Inadimplência de clientes**: agrupa `contas_receber` com `status = 'atrasado'` por
  cliente (chama `atualizar_status_vencidos` antes de ler, para não depender de um job
  externo já ter rodado).
- **Ranking de serviços mais vendidos**: soma `os_itens_servico` (quantidade e valor) por
  descrição, das OS faturadas no período, ordenado por valor.

> Implementado — dois pontos deliberados na revisão do módulo:
> - **"Lucro por OS" usa sempre `os_itens_peca.custo_unitario`** (o custo *snapshotado* no
>   momento em que a peça foi vendida naquela OS) — nunca `peca.custo_compra` (o custo atual
>   da peça, que muda a cada nova entrada de estoque). Provado registrando uma nova entrada
>   que dobrou o custo de compra de uma peça (`350.00` → `700.00`) depois que a OS já estava
>   faturada: o `custo_pecas`/`lucro` daquela OS em `lucro-por-os` continuou idêntico, porque a
>   consulta lê a coluna do item histórico, não a peça atual.
> - **"Inadimplência" e "ranking de serviços" excluem OS canceladas pela mesma construção do
>   DRE** (Módulo 5): ambos partem de `_os_faturadas_no_periodo`, que só inclui OS que
>   passaram pela transição `status_novo = 'faturado'` em `os_status_log` — e cancelamento só
>   é permitido antes dessa transição existir. Provado criando uma OS com item de serviço e
>   cancelando-a antes de faturar: o item continua no banco (auditoria), mas nunca aparece em
>   `ranking-servicos`; e como `contas_receber` só é criada por `faturar_os`, uma OS cancelada
>   nunca gera conta a receber, logo nunca pode aparecer em "inadimplência".
> - Todos os quatro endpoints são restritos a `admin`/`financeiro`, mesmo padrão do resto do
>   domínio financeiro — confirmado tanto na API (403 com token de recepção) quanto na UI
>   (link e rota não aparecem/bloqueiam para outros perfis).

## Relacionamentos-chave (resumo)

- `cliente 1—N veiculo`, `veiculo 1—N ordem_servico`
- `ordem_servico 1—N os_itens_peca/os_itens_servico/os_fotos/os_status_log`, `N—N funcionarios` (via os_funcionarios)
- `peca 1—N movimentacoes_estoque`; movimentação de entrada → `contas_pagar`; de saída → vinculada a `os_itens_peca`
- `ordem_servico → contas_receber` (ao faturar) e `→ comissoes` (ao concluir)
- `funcionario 1—N comissoes`, `1—N folha_pagamento`; fechamento de folha → `contas_pagar` (categoria Pessoal)
- `categoria_despesa` é obrigatória em toda `conta_pagar` (constraint NOT NULL + validação de serviço)

## Status de implementação

O schema completo acima já está aplicado de uma vez pela migration inicial
(`0001_initial_schema`), conforme decidido na proposta de arquitetura. O código de
aplicação (models ORM, schemas, routers, regras de negócio) é construído
incrementalmente, módulo por módulo:

1. ✅ Usuários e Autenticação
2. ✅ Clientes e Veículos
3. ✅ Estoque de Peças
4. ✅ Ordens de Serviço
5. ✅ Financeiro (contas a pagar/receber, folha, orçado x realizado, dashboards, DRE)
6. ✅ Relatórios Gerais (faturamento por período, lucro por OS, inadimplência, ranking de serviços)
