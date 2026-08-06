from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ClienteBase(BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    telefone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=150)
    cpf_cnpj: str | None = Field(default=None, max_length=20)
    endereco: str | None = Field(default=None, max_length=255)


class ClienteCreate(ClienteBase):
    pass


class ClienteUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=150)
    telefone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=150)
    cpf_cnpj: str | None = Field(default=None, max_length=20)
    endereco: str | None = Field(default=None, max_length=255)


class ClienteOut(ClienteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    criado_em: datetime


class ClienteComVeiculos(ClienteOut):
    veiculos: list["VeiculoOut"] = []


from app.schemas.veiculo import VeiculoOut  # noqa: E402

ClienteComVeiculos.model_rebuild()
