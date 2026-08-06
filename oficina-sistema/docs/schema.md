# Schema do banco de dados — Sistema de Gestão para Oficina/Funilaria

> Documento de referência, versionado junto do código. Espelha o schema aplicado
> pelas migrations do Alembic (`backend/alembic/versions/`). Qualquer alteração
> de schema deve atualizar este arquivo junto com a migration correspondente.

Convenções: `id` é `BIGSERIAL PRIMARY KEY` em todas as tabelas; `criado_em`/`atualizado_em`
são `TIMESTAMPTZ DEFAULT now()`; enums são `VARCHAR` com `CHECK` (mais simples de alterar
que `ENUM` nativo do Postgres ao longo do projeto).

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

## 2. Clientes e Veículos

**clientes**: id, nome, telefone, email, cpf_cnpj (unique), endereco, criado_em

**veiculos**: id, cliente_id → clientes, placa (unique), modelo, marca, ano, cor, km_atual, criado_em

## 3. Estoque de Peças

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

## 4. Ordens de Serviço

**ordens_servico**: id, numero (sequencial, unique), cliente_id → clientes, veiculo_id → veiculos,
status varchar CHECK IN ('orcamento','aprovado','em_execucao','aguardando_peca','concluido','faturado','pago'),
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
data_hora *(auditoria obrigatória a cada mudança de status)*

> Regra: faturar só é permitido se todo item de peça/serviço estiver preenchido (validação de
> serviço, não de schema). Faturar gera `contas_receber`. Concluir dispara cálculo de `comissoes`.

## 5. Financeiro

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
2. ⬜ Clientes e Veículos
3. ⬜ Estoque de Peças
4. ⬜ Ordens de Serviço
5. ⬜ Financeiro (contas a pagar/receber, folha, orçado x realizado, dashboards, DRE)
6. ⬜ Relatórios Gerais
