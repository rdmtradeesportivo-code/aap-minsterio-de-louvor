from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class _NormalizaFuncionarioMixin:
    @field_validator("cargo", mode="before", check_fields=False)
    @classmethod
    def _vazio_para_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v


# ---------------------------------------------------------------------- #
# Funcionários
# ---------------------------------------------------------------------- #
class FuncionarioBase(_NormalizaFuncionarioMixin, BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    cargo: str | None = Field(default=None, max_length=100)
    salario_base: Decimal = Field(default=Decimal("0"), ge=0)
    percentual_comissao_padrao: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    data_admissao: date | None = None
    usuario_id: int | None = None


class FuncionarioCreate(FuncionarioBase):
    pass


class FuncionarioUpdate(_NormalizaFuncionarioMixin, BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=150)
    cargo: str | None = Field(default=None, max_length=100)
    salario_base: Decimal | None = Field(default=None, ge=0)
    percentual_comissao_padrao: Decimal | None = Field(default=None, ge=0, le=100)
    data_admissao: date | None = None
    usuario_id: int | None = None
    ativo: bool | None = None


class FuncionarioOut(FuncionarioBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ativo: bool


# ---------------------------------------------------------------------- #
# Categorias de despesa e Centros de custo
# ---------------------------------------------------------------------- #
class CategoriaDespesaBase(BaseModel):
    nome: str = Field(min_length=1, max_length=100)
    tipo: Literal["fixa", "variavel", "pessoal", "tributos", "investimentos"]


class CategoriaDespesaCreate(CategoriaDespesaBase):
    pass


class CategoriaDespesaOut(CategoriaDespesaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class CentroCustoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: Literal["funilaria", "pintura", "mecanica", "administrativo"]


# ---------------------------------------------------------------------- #
# Contas a Pagar — lançamento manual (entrada de estoque e folha geram
# automaticamente, ver app/services/estoque.py e app/services/folha.py).
# Regra de negócio: toda saída financeira precisa de categoria — sem
# categoria, não é possível salvar (categoria_id é obrigatório aqui).
# ---------------------------------------------------------------------- #
class ContaPagarCreate(BaseModel):
    fornecedor_id: int | None = None
    descricao: str = Field(min_length=1, max_length=255)
    categoria_id: int
    centro_custo_id: int | None = None
    valor: Decimal = Field(gt=0)
    vencimento: date


class ContaPagarUpdate(BaseModel):
    fornecedor_id: int | None = None
    descricao: str | None = Field(default=None, min_length=1, max_length=255)
    categoria_id: int | None = None
    centro_custo_id: int | None = None
    valor: Decimal | None = Field(default=None, gt=0)
    vencimento: date | None = None


class ContaPagarOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    fornecedor_id: int | None
    descricao: str
    categoria_id: int
    centro_custo_id: int | None
    valor: Decimal
    vencimento: date
    status: Literal["pendente", "pago", "atrasado"]
    data_pagamento: date | None
    origem: Literal["manual", "compra_peca", "folha"]
    criado_em: datetime


# ---------------------------------------------------------------------- #
# Contas a Receber — geradas automaticamente ao faturar uma OS (Módulo 4).
# Módulo 5 adiciona a baixa (marcar como recebido).
# ---------------------------------------------------------------------- #
class ContaReceberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cliente_id: int
    os_id: int | None
    descricao: str
    valor: Decimal
    vencimento: date
    status: str
    data_recebimento: date | None
    numero_parcela: int
    total_parcelas: int
    criado_em: datetime


class ComissaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    os_id: int
    funcionario_id: int
    valor: Decimal
    percentual_aplicado: Decimal
    data_calculo: datetime
    folha_id: int | None


# ---------------------------------------------------------------------- #
# Folha de Pagamento
# ---------------------------------------------------------------------- #
class FolhaPagamentoCreate(BaseModel):
    funcionario_id: int
    # Qualquer dia do mês desejado — normalizado para o dia 1 no serviço.
    mes_referencia: date


class FolhaDescontoCreate(BaseModel):
    descricao: str = Field(min_length=1, max_length=255)
    valor: Decimal = Field(gt=0)


class FolhaDescontoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    folha_id: int
    descricao: str
    valor: Decimal


class FolhaPagamentoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    funcionario_id: int
    mes_referencia: date
    salario_base: Decimal
    total_comissoes: Decimal
    total_descontos: Decimal
    valor_liquido: Decimal
    status: Literal["aberto", "fechado", "pago"]
    data_fechamento: date | None
    conta_pagar_id: int | None
    descontos: list[FolhaDescontoOut] = []


# ---------------------------------------------------------------------- #
# Metas de orçamento (Orçado x Realizado)
# ---------------------------------------------------------------------- #
class MetaOrcamentoCreate(BaseModel):
    categoria_id: int
    mes_referencia: date
    valor_meta: Decimal = Field(ge=0)


class MetaOrcamentoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    categoria_id: int
    mes_referencia: date
    valor_meta: Decimal
