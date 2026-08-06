from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator


class _NormalizaFornecedorMixin:
    """Converte string vazia/só espaços em None (ver mesmo padrão em schemas/cliente.py)."""

    @field_validator(
        "telefone", "email", "cnpj", "endereco", mode="before", check_fields=False
    )
    @classmethod
    def _vazio_para_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v


class _NormalizaPecaMixin:
    @field_validator("unidade_medida", mode="before", check_fields=False)
    @classmethod
    def _vazio_para_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v


# ---------------------------------------------------------------------- #
# Fornecedores
# ---------------------------------------------------------------------- #
class FornecedorBase(_NormalizaFornecedorMixin, BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    telefone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=150)
    cnpj: str | None = Field(default=None, max_length=20)
    endereco: str | None = Field(default=None, max_length=255)


class FornecedorCreate(FornecedorBase):
    pass


class FornecedorUpdate(_NormalizaFornecedorMixin, BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=150)
    telefone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=150)
    cnpj: str | None = Field(default=None, max_length=20)
    endereco: str | None = Field(default=None, max_length=255)


class FornecedorOut(FornecedorBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


# ---------------------------------------------------------------------- #
# Categorias de peça
# ---------------------------------------------------------------------- #
class CategoriaPecaBase(BaseModel):
    nome: str = Field(min_length=1, max_length=80)


class CategoriaPecaCreate(CategoriaPecaBase):
    pass


class CategoriaPecaOut(CategoriaPecaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


# ---------------------------------------------------------------------- #
# Peças
#
# Regra de negócio: estoque_atual nunca é definido diretamente por
# create/update — só muda através de movimentações (entrada/ajuste/saída),
# para não divergir do histórico de movimentações (ver serviço
# app/services/estoque.py).
# ---------------------------------------------------------------------- #
class PecaBase(_NormalizaPecaMixin, BaseModel):
    codigo: str = Field(min_length=1, max_length=50)
    descricao: str = Field(min_length=1, max_length=255)
    categoria_id: int | None = None
    fornecedor_id: int | None = None
    unidade_medida: str | None = Field(default=None, max_length=10)
    custo_compra: Decimal = Field(default=Decimal("0"), ge=0)
    preco_venda: Decimal = Field(default=Decimal("0"), ge=0)
    estoque_minimo: Decimal = Field(default=Decimal("0"), ge=0)


class PecaCreate(PecaBase):
    pass


class PecaUpdate(_NormalizaPecaMixin, BaseModel):
    codigo: str | None = Field(default=None, min_length=1, max_length=50)
    descricao: str | None = Field(default=None, min_length=1, max_length=255)
    categoria_id: int | None = None
    fornecedor_id: int | None = None
    unidade_medida: str | None = Field(default=None, max_length=10)
    custo_compra: Decimal | None = Field(default=None, ge=0)
    preco_venda: Decimal | None = Field(default=None, ge=0)
    estoque_minimo: Decimal | None = Field(default=None, ge=0)


class PecaOut(PecaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    estoque_atual: Decimal
    criado_em: datetime

    @computed_field
    @property
    def estoque_baixo(self) -> bool:
        return self.estoque_atual <= self.estoque_minimo


# ---------------------------------------------------------------------- #
# Movimentações de estoque
#
# Módulo 3 expõe apenas "entrada" (compra, gera contas_pagar) e "ajuste"
# (inventário físico, exige motivo). "saida" só existe vinculada a um item
# de OS e chega no Módulo 4 — nunca é lançada solta (regra de negócio).
# ---------------------------------------------------------------------- #
class EntradaEstoqueCreate(BaseModel):
    peca_id: int
    quantidade: Decimal = Field(gt=0)
    # Se omitido, usa o custo_compra atual da peça.
    custo_unitario: Decimal | None = Field(default=None, ge=0)
    # Se omitido, usa o fornecedor cadastrado na peça.
    fornecedor_id: int | None = None
    vencimento: date
    # Se omitido, usa/cria a categoria de despesa "Peças e Insumos" (variável).
    categoria_id: int | None = None
    centro_custo_id: int | None = None
    observacao: str | None = Field(default=None, max_length=255)


class AjusteEstoqueCreate(BaseModel):
    peca_id: int
    # Delta: positivo (sobra encontrada no inventário) ou negativo (perda/quebra).
    quantidade: Decimal
    motivo: str = Field(min_length=1, max_length=255)
    observacao: str | None = Field(default=None, max_length=255)

    @field_validator("quantidade")
    @classmethod
    def _quantidade_nao_pode_ser_zero(cls, v: Decimal) -> Decimal:
        if v == 0:
            raise ValueError("A quantidade do ajuste não pode ser zero")
        return v


class MovimentacaoEstoqueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    peca_id: int
    tipo: Literal["entrada", "saida", "ajuste"]
    quantidade: Decimal
    motivo: str | None
    os_id: int | None
    usuario_id: int | None
    conta_pagar_id: int | None
    observacao: str | None
    criado_em: datetime
