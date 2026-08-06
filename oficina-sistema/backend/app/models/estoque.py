from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    pass

TIPOS_MOVIMENTACAO = ("entrada", "saida", "ajuste")


class Fornecedor(Base):
    __tablename__ = "fornecedores"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    telefone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(150))
    cnpj: Mapped[str | None] = mapped_column(String(20))
    endereco: Mapped[str | None] = mapped_column(String(255))


class CategoriaPeca(Base):
    __tablename__ = "categorias_peca"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(80), nullable=False)


class Peca(Base):
    __tablename__ = "pecas"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    descricao: Mapped[str] = mapped_column(String(255), nullable=False)
    categoria_id: Mapped[int | None] = mapped_column(ForeignKey("categorias_peca.id"))
    fornecedor_id: Mapped[int | None] = mapped_column(ForeignKey("fornecedores.id"))
    unidade_medida: Mapped[str | None] = mapped_column(String(10))
    custo_compra: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    preco_venda: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    estoque_minimo: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    estoque_atual: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class MovimentacaoEstoque(Base):
    __tablename__ = "movimentacoes_estoque"
    __table_args__ = (
        CheckConstraint(
            f"tipo IN {TIPOS_MOVIMENTACAO}", name="ck_movimentacoes_estoque_tipo"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    peca_id: Mapped[int] = mapped_column(ForeignKey("pecas.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)
    quantidade: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    motivo: Mapped[str | None] = mapped_column(String(255))
    # OS ainda não tem model ORM (chega no Módulo 4) — a FK já existe no
    # banco (migration 0001), então mantemos a coluna sem relationship por
    # enquanto; será preenchida quando a saída por consumo em OS existir.
    os_id: Mapped[int | None] = mapped_column(BigInteger)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    conta_pagar_id: Mapped[int | None] = mapped_column(ForeignKey("contas_pagar.id"))
    observacao: Mapped[str | None] = mapped_column(String(255))
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    peca: Mapped["Peca"] = relationship()
