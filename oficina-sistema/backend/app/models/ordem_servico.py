"""Models do domínio Ordens de Serviço (Módulo 4).

`OrdemServico.valor_total` (coluna do banco, definida na migration 0001) é
deliberadamente NÃO mapeada aqui — a regra de negócio pedida é que o valor
total nunca seja uma fonte de verdade solta que pode desatualizar. A API
sempre soma os itens (peça + serviço) na hora da resposta
(`app/services/ordem_servico.py::calcular_valor_total`); a coluna do banco
fica presente só por compatibilidade com o schema original, mas a aplicação
nunca lê nem escreve nela.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.cliente import Cliente
    from app.models.veiculo import Veiculo

STATUS_OS = (
    "orcamento",
    "aprovado",
    "em_execucao",
    "aguardando_peca",
    "concluido",
    "faturado",
    "pago",
    "cancelado",
)

# Depois de faturada, uma OS nunca é cancelada — só existe estorno/nota de
# crédito (fora de escopo por ora). Cancelamento é permitido em qualquer
# status anterior a "faturado".
STATUS_ANTES_DE_FATURAR = (
    "orcamento",
    "aprovado",
    "em_execucao",
    "aguardando_peca",
    "concluido",
)


class OrdemServico(Base):
    __tablename__ = "ordens_servico"
    __table_args__ = (CheckConstraint(f"status IN {STATUS_OS}", name="ck_ordens_servico_status"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    # Gerado pelo banco (sequence, ver migration 0001). server_default aqui
    # precisa espelhar o DDL real — sem isso o SQLAlchemy manda `numero=NULL`
    # explicitamente no INSERT em vez de deixar a sequence do Postgres agir.
    numero: Mapped[int] = mapped_column(
        Integer, unique=True, server_default=text("nextval('ordens_servico_numero_seq')")
    )
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"), nullable=False)
    veiculo_id: Mapped[int] = mapped_column(ForeignKey("veiculos.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="orcamento")
    data_abertura: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    prazo_estimado: Mapped[date | None] = mapped_column(Date)
    forma_pagamento: Mapped[str | None] = mapped_column(String(30))
    criado_por: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Somente leitura aqui (sem back_populates do lado de Cliente/Veiculo) —
    # usado para embutir um resumo do cliente/veículo na resposta da OS, já
    # que /api/clientes e /api/veiculos são restritos a admin/financeiro/
    # recepção e o mecânico também precisa desse contexto na OS dele.
    cliente: Mapped["Cliente"] = relationship(viewonly=True)
    veiculo: Mapped["Veiculo"] = relationship(viewonly=True)

    itens_peca: Mapped[list["OsItemPeca"]] = relationship(
        back_populates="os", cascade="all, delete-orphan"
    )
    itens_servico: Mapped[list["OsItemServico"]] = relationship(
        back_populates="os", cascade="all, delete-orphan"
    )
    funcionarios: Mapped[list["OsFuncionario"]] = relationship(
        back_populates="os", cascade="all, delete-orphan"
    )
    fotos: Mapped[list["OsFoto"]] = relationship(back_populates="os", cascade="all, delete-orphan")
    status_log: Mapped[list["OsStatusLog"]] = relationship(
        back_populates="os", cascade="all, delete-orphan", order_by="OsStatusLog.data_hora"
    )


class OsItemPeca(Base):
    __tablename__ = "os_itens_peca"

    id: Mapped[int] = mapped_column(primary_key=True)
    os_id: Mapped[int] = mapped_column(ForeignKey("ordens_servico.id"), nullable=False)
    peca_id: Mapped[int] = mapped_column(ForeignKey("pecas.id"), nullable=False)
    quantidade: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    preco_unitario_venda: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    # snapshot do custo no momento da baixa — histórico não muda se o custo da peça mudar depois
    custo_unitario: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    os: Mapped["OrdemServico"] = relationship(back_populates="itens_peca")


class OsItemServico(Base):
    __tablename__ = "os_itens_servico"

    id: Mapped[int] = mapped_column(primary_key=True)
    os_id: Mapped[int] = mapped_column(ForeignKey("ordens_servico.id"), nullable=False)
    descricao: Mapped[str] = mapped_column(String(255), nullable=False)
    valor: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    funcionario_id: Mapped[int | None] = mapped_column(ForeignKey("funcionarios.id"))

    os: Mapped["OrdemServico"] = relationship(back_populates="itens_servico")


class OsFuncionario(Base):
    __tablename__ = "os_funcionarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    os_id: Mapped[int] = mapped_column(ForeignKey("ordens_servico.id"), nullable=False)
    funcionario_id: Mapped[int] = mapped_column(ForeignKey("funcionarios.id"), nullable=False)
    papel: Mapped[str | None] = mapped_column(String(50))

    os: Mapped["OrdemServico"] = relationship(back_populates="funcionarios")


class OsFoto(Base):
    __tablename__ = "os_fotos"
    __table_args__ = (CheckConstraint("tipo IN ('antes','depois')", name="ck_os_fotos_tipo"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    os_id: Mapped[int] = mapped_column(ForeignKey("ordens_servico.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)
    caminho_arquivo: Mapped[str] = mapped_column(String(500), nullable=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    os: Mapped["OrdemServico"] = relationship(back_populates="fotos")


class OsStatusLog(Base):
    __tablename__ = "os_status_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    os_id: Mapped[int] = mapped_column(ForeignKey("ordens_servico.id"), nullable=False)
    status_anterior: Mapped[str | None] = mapped_column(String(20))
    status_novo: Mapped[str] = mapped_column(String(20), nullable=False)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    data_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # Só preenchido no cancelamento (migration 0002); demais transições ficam NULL.
    motivo: Mapped[str | None] = mapped_column(String(255))

    os: Mapped["OrdemServico"] = relationship(back_populates="status_log")
