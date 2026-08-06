"""schema inicial completo (todos os módulos, conforme docs/schema.md)

Cria de uma vez todas as tabelas do sistema, já validadas na proposta de
arquitetura. O código de aplicação (models ORM, routers, regras de negócio)
é implementado incrementalmente módulo por módulo — mas o schema do banco
nasce completo para evitar migrations fragmentadas e inconsistências de FK
entre módulos que ainda não foram codificados.

Revision ID: 0001
Revises:
Create Date: 2026-08-06

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # 1. Usuários e Permissões
    # ------------------------------------------------------------------ #
    op.create_table(
        "usuarios",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("nome", sa.String(150), nullable=False),
        sa.Column("email", sa.String(150), nullable=False),
        sa.Column("senha_hash", sa.String(255), nullable=False),
        sa.Column("perfil", sa.String(20), nullable=False),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("email", name="uq_usuarios_email"),
        sa.CheckConstraint(
            "perfil IN ('admin','financeiro','recepcao','mecanico')",
            name="ck_usuarios_perfil",
        ),
    )

    # ------------------------------------------------------------------ #
    # 2. Clientes e Veículos
    # ------------------------------------------------------------------ #
    op.create_table(
        "clientes",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("nome", sa.String(150), nullable=False),
        sa.Column("telefone", sa.String(20)),
        sa.Column("email", sa.String(150)),
        sa.Column("cpf_cnpj", sa.String(20)),
        sa.Column("endereco", sa.String(255)),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("cpf_cnpj", name="uq_clientes_cpf_cnpj"),
    )

    op.create_table(
        "veiculos",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("cliente_id", sa.BigInteger(), sa.ForeignKey("clientes.id"), nullable=False),
        sa.Column("placa", sa.String(10), nullable=False),
        sa.Column("modelo", sa.String(100)),
        sa.Column("marca", sa.String(100)),
        sa.Column("ano", sa.Integer()),
        sa.Column("cor", sa.String(40)),
        sa.Column("km_atual", sa.Numeric(12, 2)),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("placa", name="uq_veiculos_placa"),
    )

    # ------------------------------------------------------------------ #
    # 3. Estoque de Peças
    # ------------------------------------------------------------------ #
    op.create_table(
        "fornecedores",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("nome", sa.String(150), nullable=False),
        sa.Column("telefone", sa.String(20)),
        sa.Column("email", sa.String(150)),
        sa.Column("cnpj", sa.String(20)),
        sa.Column("endereco", sa.String(255)),
    )

    op.create_table(
        "categorias_peca",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("nome", sa.String(80), nullable=False),
    )

    op.create_table(
        "pecas",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("codigo", sa.String(50), nullable=False),
        sa.Column("descricao", sa.String(255), nullable=False),
        sa.Column("categoria_id", sa.BigInteger(), sa.ForeignKey("categorias_peca.id")),
        sa.Column("fornecedor_id", sa.BigInteger(), sa.ForeignKey("fornecedores.id")),
        sa.Column("unidade_medida", sa.String(10)),
        sa.Column("custo_compra", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("preco_venda", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("estoque_minimo", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("estoque_atual", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("codigo", name="uq_pecas_codigo"),
    )

    # ------------------------------------------------------------------ #
    # 5. Financeiro — categorias/centros de custo e contas a pagar
    #    (criados antes de ordens_servico pois contas_pagar não depende
    #    dela, e movimentacoes_estoque/folha_pagamento dependem de
    #    contas_pagar)
    # ------------------------------------------------------------------ #
    op.create_table(
        "categorias_despesa",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("nome", sa.String(100), nullable=False),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.CheckConstraint(
            "tipo IN ('fixa','variavel','pessoal','tributos','investimentos')",
            name="ck_categorias_despesa_tipo",
        ),
    )

    op.create_table(
        "centros_custo",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("nome", sa.String(30), nullable=False),
        sa.CheckConstraint(
            "nome IN ('funilaria','pintura','mecanica','administrativo')",
            name="ck_centros_custo_nome",
        ),
    )

    op.create_table(
        "funcionarios",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("usuario_id", sa.BigInteger(), sa.ForeignKey("usuarios.id")),
        sa.Column("nome", sa.String(150), nullable=False),
        sa.Column("cargo", sa.String(100)),
        sa.Column("salario_base", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("percentual_comissao_padrao", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("data_admissao", sa.Date()),
    )

    op.create_table(
        "contas_pagar",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("fornecedor_id", sa.BigInteger(), sa.ForeignKey("fornecedores.id")),
        sa.Column("descricao", sa.String(255), nullable=False),
        # regra de negócio: toda saída financeira precisa de categoria
        sa.Column(
            "categoria_id",
            sa.BigInteger(),
            sa.ForeignKey("categorias_despesa.id"),
            nullable=False,
        ),
        sa.Column("centro_custo_id", sa.BigInteger(), sa.ForeignKey("centros_custo.id")),
        sa.Column("valor", sa.Numeric(12, 2), nullable=False),
        sa.Column("vencimento", sa.Date(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pendente"),
        sa.Column("data_pagamento", sa.Date()),
        sa.Column("origem", sa.String(20), nullable=False, server_default="manual"),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint(
            "status IN ('pendente','pago','atrasado')", name="ck_contas_pagar_status"
        ),
        sa.CheckConstraint(
            "origem IN ('manual','compra_peca','folha')", name="ck_contas_pagar_origem"
        ),
    )

    # ------------------------------------------------------------------ #
    # 4. Ordens de Serviço
    # ------------------------------------------------------------------ #
    op.execute("CREATE SEQUENCE ordens_servico_numero_seq START 1")

    op.create_table(
        "ordens_servico",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column(
            "numero",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("nextval('ordens_servico_numero_seq')"),
        ),
        sa.Column("cliente_id", sa.BigInteger(), sa.ForeignKey("clientes.id"), nullable=False),
        sa.Column("veiculo_id", sa.BigInteger(), sa.ForeignKey("veiculos.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="orcamento"),
        sa.Column("data_abertura", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("prazo_estimado", sa.Date()),
        sa.Column("forma_pagamento", sa.String(30)),
        sa.Column("valor_total", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("criado_por", sa.BigInteger(), sa.ForeignKey("usuarios.id")),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("numero", name="uq_ordens_servico_numero"),
        sa.CheckConstraint(
            "status IN ('orcamento','aprovado','em_execucao','aguardando_peca',"
            "'concluido','faturado','pago')",
            name="ck_ordens_servico_status",
        ),
    )
    op.execute(
        "ALTER SEQUENCE ordens_servico_numero_seq OWNED BY ordens_servico.numero"
    )

    op.create_table(
        "movimentacoes_estoque",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("peca_id", sa.BigInteger(), sa.ForeignKey("pecas.id"), nullable=False),
        sa.Column("tipo", sa.String(10), nullable=False),
        sa.Column("quantidade", sa.Numeric(12, 2), nullable=False),
        sa.Column("motivo", sa.String(255)),
        sa.Column("os_id", sa.BigInteger(), sa.ForeignKey("ordens_servico.id")),
        sa.Column("usuario_id", sa.BigInteger(), sa.ForeignKey("usuarios.id")),
        sa.Column("conta_pagar_id", sa.BigInteger(), sa.ForeignKey("contas_pagar.id")),
        sa.Column("observacao", sa.String(255)),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint(
            "tipo IN ('entrada','saida','ajuste')", name="ck_movimentacoes_estoque_tipo"
        ),
    )

    op.create_table(
        "os_itens_peca",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("os_id", sa.BigInteger(), sa.ForeignKey("ordens_servico.id"), nullable=False),
        sa.Column("peca_id", sa.BigInteger(), sa.ForeignKey("pecas.id"), nullable=False),
        sa.Column("quantidade", sa.Numeric(12, 2), nullable=False),
        sa.Column("preco_unitario_venda", sa.Numeric(12, 2), nullable=False),
        # snapshot do custo no momento da venda — histórico não muda se o
        # custo da peça mudar depois
        sa.Column("custo_unitario", sa.Numeric(12, 2), nullable=False),
    )

    op.create_table(
        "os_itens_servico",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("os_id", sa.BigInteger(), sa.ForeignKey("ordens_servico.id"), nullable=False),
        sa.Column("descricao", sa.String(255), nullable=False),
        sa.Column("valor", sa.Numeric(12, 2), nullable=False),
        sa.Column("funcionario_id", sa.BigInteger(), sa.ForeignKey("funcionarios.id")),
    )

    op.create_table(
        "os_funcionarios",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("os_id", sa.BigInteger(), sa.ForeignKey("ordens_servico.id"), nullable=False),
        sa.Column("funcionario_id", sa.BigInteger(), sa.ForeignKey("funcionarios.id"), nullable=False),
        sa.Column("papel", sa.String(50)),
    )

    op.create_table(
        "os_fotos",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("os_id", sa.BigInteger(), sa.ForeignKey("ordens_servico.id"), nullable=False),
        sa.Column("tipo", sa.String(10), nullable=False),
        sa.Column("caminho_arquivo", sa.String(500), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("tipo IN ('antes','depois')", name="ck_os_fotos_tipo"),
    )

    op.create_table(
        "os_status_log",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("os_id", sa.BigInteger(), sa.ForeignKey("ordens_servico.id"), nullable=False),
        sa.Column("status_anterior", sa.String(20)),
        sa.Column("status_novo", sa.String(20), nullable=False),
        sa.Column("usuario_id", sa.BigInteger(), sa.ForeignKey("usuarios.id")),
        sa.Column("data_hora", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------ #
    # 5. Financeiro (continuação)
    # ------------------------------------------------------------------ #
    op.create_table(
        "contas_receber",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("cliente_id", sa.BigInteger(), sa.ForeignKey("clientes.id"), nullable=False),
        sa.Column("os_id", sa.BigInteger(), sa.ForeignKey("ordens_servico.id")),
        sa.Column("descricao", sa.String(255), nullable=False),
        sa.Column("valor", sa.Numeric(12, 2), nullable=False),
        sa.Column("vencimento", sa.Date(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pendente"),
        sa.Column("data_recebimento", sa.Date()),
        sa.Column("numero_parcela", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("total_parcelas", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint(
            "status IN ('pendente','recebido','atrasado')", name="ck_contas_receber_status"
        ),
    )

    op.create_table(
        "regras_comissao",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("funcionario_id", sa.BigInteger(), sa.ForeignKey("funcionarios.id")),
        sa.Column("categoria_peca_id", sa.BigInteger(), sa.ForeignKey("categorias_peca.id")),
        sa.Column("percentual", sa.Numeric(5, 2), nullable=False),
    )

    op.create_table(
        "folha_pagamento",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("funcionario_id", sa.BigInteger(), sa.ForeignKey("funcionarios.id"), nullable=False),
        sa.Column("mes_referencia", sa.Date(), nullable=False),
        sa.Column("salario_base", sa.Numeric(12, 2), nullable=False),
        sa.Column("total_comissoes", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_descontos", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("valor_liquido", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="aberto"),
        sa.Column("data_fechamento", sa.Date()),
        sa.Column("conta_pagar_id", sa.BigInteger(), sa.ForeignKey("contas_pagar.id")),
        sa.CheckConstraint(
            "status IN ('aberto','fechado','pago')", name="ck_folha_pagamento_status"
        ),
        sa.UniqueConstraint(
            "funcionario_id", "mes_referencia", name="uq_folha_pagamento_funcionario_mes"
        ),
    )

    op.create_table(
        "comissoes",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("os_id", sa.BigInteger(), sa.ForeignKey("ordens_servico.id"), nullable=False),
        sa.Column("funcionario_id", sa.BigInteger(), sa.ForeignKey("funcionarios.id"), nullable=False),
        sa.Column("valor", sa.Numeric(12, 2), nullable=False),
        sa.Column("percentual_aplicado", sa.Numeric(5, 2), nullable=False),
        sa.Column("data_calculo", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("folha_id", sa.BigInteger(), sa.ForeignKey("folha_pagamento.id")),
    )

    op.create_table(
        "folha_descontos",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("folha_id", sa.BigInteger(), sa.ForeignKey("folha_pagamento.id"), nullable=False),
        sa.Column("descricao", sa.String(255), nullable=False),
        sa.Column("valor", sa.Numeric(12, 2), nullable=False),
    )

    op.create_table(
        "metas_orcamento",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("categoria_id", sa.BigInteger(), sa.ForeignKey("categorias_despesa.id"), nullable=False),
        sa.Column("mes_referencia", sa.Date(), nullable=False),
        sa.Column("valor_meta", sa.Numeric(12, 2), nullable=False),
        sa.UniqueConstraint(
            "categoria_id", "mes_referencia", name="uq_metas_orcamento_categoria_mes"
        ),
    )


def downgrade() -> None:
    op.drop_table("metas_orcamento")
    op.drop_table("folha_descontos")
    op.drop_table("comissoes")
    op.drop_table("folha_pagamento")
    op.drop_table("regras_comissao")
    op.drop_table("contas_receber")
    op.drop_table("os_status_log")
    op.drop_table("os_fotos")
    op.drop_table("os_funcionarios")
    op.drop_table("os_itens_servico")
    op.drop_table("os_itens_peca")
    op.drop_table("movimentacoes_estoque")
    op.drop_table("ordens_servico")
    op.execute("DROP SEQUENCE IF EXISTS ordens_servico_numero_seq")
    op.drop_table("contas_pagar")
    op.drop_table("funcionarios")
    op.drop_table("centros_custo")
    op.drop_table("categorias_despesa")
    op.drop_table("pecas")
    op.drop_table("categorias_peca")
    op.drop_table("fornecedores")
    op.drop_table("veiculos")
    op.drop_table("clientes")
    op.drop_table("usuarios")
