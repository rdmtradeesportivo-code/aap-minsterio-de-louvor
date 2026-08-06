from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class _NormalizaVaziosMixin:
    """Converte string vazia/só espaços em None (ver mesmo mixin em schemas/cliente.py)."""

    @field_validator("modelo", "marca", "cor", mode="before", check_fields=False)
    @classmethod
    def _vazio_para_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v


class VeiculoBase(_NormalizaVaziosMixin, BaseModel):
    placa: str = Field(min_length=1, max_length=10)
    modelo: str | None = Field(default=None, max_length=100)
    marca: str | None = Field(default=None, max_length=100)
    ano: int | None = None
    cor: str | None = Field(default=None, max_length=40)
    km_atual: Decimal | None = None


class VeiculoCreate(VeiculoBase):
    cliente_id: int


class VeiculoUpdate(_NormalizaVaziosMixin, BaseModel):
    placa: str | None = Field(default=None, min_length=1, max_length=10)
    modelo: str | None = Field(default=None, max_length=100)
    marca: str | None = Field(default=None, max_length=100)
    ano: int | None = None
    cor: str | None = Field(default=None, max_length=40)
    km_atual: Decimal | None = None
    cliente_id: int | None = None


class VeiculoOut(VeiculoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cliente_id: int
    criado_em: datetime
