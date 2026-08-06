from datetime import date, datetime
from decimal import Decimal

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
# Contas a Receber e Comissões — somente leitura no Módulo 4 (geradas
# automaticamente ao faturar/concluir uma OS; o CRUD completo de
# lançamento manual é o Módulo 5).
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
