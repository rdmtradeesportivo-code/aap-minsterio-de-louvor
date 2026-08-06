"""Models do domínio Financeiro.

Implementado incrementalmente conforme os módulos anteriores precisam:

- Módulo 3 (Estoque) precisou gerar `contas_pagar` automaticamente ao
  registrar uma entrada de peças → CategoriaDespesa, CentroCusto, ContaPagar.
- Módulo 4 (Ordens de Serviço) precisa de Funcionario (responsável/comissão),
  RegraComissao (percentual aplicado), Comissao (calculada ao concluir a OS)
  e ContaReceber (gerada ao faturar) → entram aqui agora.

O restante do domínio financeiro (folha_pagamento, folha_descontos,
metas_orcamento) fica para o Módulo 5, quando os relatórios e o fechamento
mensal completo forem implementados.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

TIPOS_CATEGORIA_DESPESA = ("fixa", "variavel", "pessoal", "tributos", "investimentos")
NOMES_CENTRO_CUSTO = ("funilaria", "pintura", "mecanica", "administrativo")
STATUS_CONTA_PAGAR = ("pendente", "pago", "atrasado")
ORIGENS_CONTA_PAGAR = ("manual", "compra_peca", "folha")
STATUS_CONTA_RECEBER = ("pendente", "recebido", "atrasado")


class CategoriaDespesa(Base):
    __tablename__ = "categorias_despesa"
    __table_args__ = (
        CheckConstraint(
            f"tipo IN {TIPOS_CATEGORIA_DESPESA}", name="ck_categorias_despesa_tipo"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)


class CentroCusto(Base):
    __tablename__ = "centros_custo"
    __table_args__ = (
        CheckConstraint(f"nome IN {NOMES_CENTRO_CUSTO}", name="ck_centros_custo_nome"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(30), nullable=False)


class ContaPagar(Base):
    __tablename__ = "contas_pagar"
    __table_args__ = (
        CheckConstraint(f"status IN {STATUS_CONTA_PAGAR}", name="ck_contas_pagar_status"),
        CheckConstraint(f"origem IN {ORIGENS_CONTA_PAGAR}", name="ck_contas_pagar_origem"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    fornecedor_id: Mapped[int | None] = mapped_column(ForeignKey("fornecedores.id"))
    descricao: Mapped[str] = mapped_column(String(255), nullable=False)
    # Regra de negócio: toda saída financeira precisa de categoria — sem
    # categoria, não é possível salvar o lançamento (NOT NULL na coluna).
    categoria_id: Mapped[int] = mapped_column(
        ForeignKey("categorias_despesa.id"), nullable=False
    )
    centro_custo_id: Mapped[int | None] = mapped_column(ForeignKey("centros_custo.id"))
    valor: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    vencimento: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pendente")
    data_pagamento: Mapped[date | None] = mapped_column(Date)
    origem: Mapped[str] = mapped_column(String(20), nullable=False, default="manual")
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ContaReceber(Base):
    __tablename__ = "contas_receber"
    __table_args__ = (
        CheckConstraint(f"status IN {STATUS_CONTA_RECEBER}", name="ck_contas_receber_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"), nullable=False)
    os_id: Mapped[int | None] = mapped_column(ForeignKey("ordens_servico.id"))
    descricao: Mapped[str] = mapped_column(String(255), nullable=False)
    valor: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    vencimento: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pendente")
    data_recebimento: Mapped[date | None] = mapped_column(Date)
    numero_parcela: Mapped[int] = mapped_column(default=1)
    total_parcelas: Mapped[int] = mapped_column(default=1)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Funcionario(Base):
    __tablename__ = "funcionarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Nem todo funcionário precisa de login no sistema.
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    cargo: Mapped[str | None] = mapped_column(String(100))
    salario_base: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    percentual_comissao_padrao: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=0
    )
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    data_admissao: Mapped[date | None] = mapped_column(Date)


class RegraComissao(Base):
    """Permite variar o percentual de comissão por funcionário e/ou
    categoria de peça. `funcionario_id` nulo = regra geral (aplica a todos);
    `categoria_peca_id` nulo = aplica a qualquer tipo de serviço.

    Módulo 4 usa apenas a regra por funcionário (serviços de OS não têm uma
    categoria de peça associada) — o campo `categoria_peca_id` fica pronto
    para um motor de regras mais rico no futuro, mas ainda não é consultado
    pelo cálculo de comissão.
    """

    __tablename__ = "regras_comissao"

    id: Mapped[int] = mapped_column(primary_key=True)
    funcionario_id: Mapped[int | None] = mapped_column(ForeignKey("funcionarios.id"))
    categoria_peca_id: Mapped[int | None] = mapped_column(ForeignKey("categorias_peca.id"))
    percentual: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)


class Comissao(Base):
    __tablename__ = "comissoes"

    id: Mapped[int] = mapped_column(primary_key=True)
    os_id: Mapped[int] = mapped_column(ForeignKey("ordens_servico.id"), nullable=False)
    funcionario_id: Mapped[int] = mapped_column(ForeignKey("funcionarios.id"), nullable=False)
    valor: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    percentual_aplicado: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    data_calculo: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    # folha_pagamento ainda não tem model ORM (chega no Módulo 5) — a FK já
    # existe no banco (migration 0001); mantemos sem relationship por ora.
    folha_id: Mapped[int | None] = mapped_column(BigInteger)
