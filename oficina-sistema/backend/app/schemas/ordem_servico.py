from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.models.ordem_servico import STATUS_OS

StatusOS = Literal[
    "orcamento",
    "aprovado",
    "em_execucao",
    "aguardando_peca",
    "concluido",
    "faturado",
    "pago",
    "cancelado",
]


# ---------------------------------------------------------------------- #
# Ordem de Serviço
# ---------------------------------------------------------------------- #
class OrdemServicoCreate(BaseModel):
    cliente_id: int
    veiculo_id: int
    prazo_estimado: date | None = None
    forma_pagamento: str | None = Field(default=None, max_length=30)


class OrdemServicoUpdate(BaseModel):
    prazo_estimado: date | None = None
    forma_pagamento: str | None = Field(default=None, max_length=30)


class StatusUpdate(BaseModel):
    novo_status: StatusOS


class FaturarRequest(BaseModel):
    numero_parcelas: int = Field(default=1, ge=1, le=24)


class CancelarRequest(BaseModel):
    motivo: str | None = Field(default=None, max_length=255)


# ---------------------------------------------------------------------- #
# Itens
# ---------------------------------------------------------------------- #
class ItemPecaCreate(BaseModel):
    peca_id: int
    quantidade: Decimal = Field(gt=0)
    # Se omitido, usa o preço de venda cadastrado na peça.
    preco_unitario_venda: Decimal | None = Field(default=None, ge=0)


class ItemPecaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    os_id: int
    peca_id: int
    quantidade: Decimal
    preco_unitario_venda: Decimal
    custo_unitario: Decimal


class ItemServicoCreate(BaseModel):
    descricao: str = Field(min_length=1, max_length=255)
    valor: Decimal = Field(ge=0)
    funcionario_id: int | None = None


class ItemServicoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    os_id: int
    descricao: str
    valor: Decimal
    funcionario_id: int | None


class OsFuncionarioCreate(BaseModel):
    funcionario_id: int
    papel: str | None = Field(default=None, max_length=50)


class OsFuncionarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    os_id: int
    funcionario_id: int
    papel: str | None


class OsFotoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    os_id: int
    tipo: Literal["antes", "depois"]
    caminho_arquivo: str
    criado_em: datetime


class OsStatusLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    os_id: int
    status_anterior: str | None
    status_novo: str
    usuario_id: int | None
    data_hora: datetime
    motivo: str | None


# ---------------------------------------------------------------------- #
# Resumos embutidos de cliente/veículo — /api/clientes e /api/veiculos são
# restritos a admin/financeiro/recepção, mas o mecânico também precisa
# desse contexto mínimo na OS dele, então a própria resposta da OS já traz.
# ---------------------------------------------------------------------- #
class ClienteResumo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    telefone: str | None


class VeiculoResumo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    placa: str
    modelo: str | None
    marca: str | None


# ---------------------------------------------------------------------- #
# Saída (list/detail) — valor_total é sempre computado a partir dos itens
# já carregados, nunca lido de uma coluna que possa desatualizar.
# ---------------------------------------------------------------------- #
class OrdemServicoResumoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    numero: int
    cliente_id: int
    veiculo_id: int
    cliente: ClienteResumo
    veiculo: VeiculoResumo
    status: StatusOS
    data_abertura: datetime
    prazo_estimado: date | None
    forma_pagamento: str | None
    criado_por: int | None
    criado_em: datetime
    atualizado_em: datetime
    itens_peca: list[ItemPecaOut] = []
    itens_servico: list[ItemServicoOut] = []

    @computed_field
    @property
    def valor_total(self) -> Decimal:
        total_pecas = sum(
            (item.quantidade * item.preco_unitario_venda for item in self.itens_peca),
            Decimal("0"),
        )
        total_servicos = sum((item.valor for item in self.itens_servico), Decimal("0"))
        return (total_pecas + total_servicos).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class OrdemServicoDetalheOut(OrdemServicoResumoOut):
    funcionarios: list[OsFuncionarioOut] = []
    fotos: list[OsFotoOut] = []
    status_log: list[OsStatusLogOut] = []


assert set(StatusOS.__args__) == set(STATUS_OS)  # mantém schema e model em sincronia
