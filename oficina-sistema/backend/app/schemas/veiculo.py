from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class VeiculoBase(BaseModel):
    placa: str = Field(min_length=1, max_length=10)
    modelo: str | None = Field(default=None, max_length=100)
    marca: str | None = Field(default=None, max_length=100)
    ano: int | None = None
    cor: str | None = Field(default=None, max_length=40)
    km_atual: Decimal | None = None


class VeiculoCreate(VeiculoBase):
    cliente_id: int


class VeiculoUpdate(BaseModel):
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
