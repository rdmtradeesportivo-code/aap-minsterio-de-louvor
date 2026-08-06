"""Models do domínio Financeiro.

Implementado incrementalmente conforme os módulos anteriores precisam: o
Módulo 3 (Estoque) precisa gerar `contas_pagar` automaticamente ao registrar
uma entrada de peças, então os models mínimos para isso (CategoriaDespesa,
CentroCusto, ContaPagar) entram aqui já. O restante do domínio financeiro
(contas_receber, funcionarios, comissoes, folha_pagamento, regras_comissao,
metas_orcamento) é adicionado quando os módulos que os utilizam chegarem —
Ordens de Serviço (Módulo 4) e o Financeiro completo (Módulo 5).
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

TIPOS_CATEGORIA_DESPESA = ("fixa", "variavel", "pessoal", "tributos", "investimentos")
NOMES_CENTRO_CUSTO = ("funilaria", "pintura", "mecanica", "administrativo")
STATUS_CONTA_PAGAR = ("pendente", "pago", "atrasado")
ORIGENS_CONTA_PAGAR = ("manual", "compra_peca", "folha")


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
