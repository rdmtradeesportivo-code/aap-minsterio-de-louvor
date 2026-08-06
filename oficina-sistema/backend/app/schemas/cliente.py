from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class _NormalizaVaziosMixin:
    """Converte string vazia/só espaços em None.

    Sem isso, campos opcionais e únicos (ex: cpf_cnpj) armazenariam ""
    em vez de NULL — e dois clientes sem CPF cadastrado colidiriam na
    constraint UNIQUE (Postgres trata múltiplos NULL como distintos, mas
    "" == "" é considerado duplicata).
    """

    @field_validator(
        "telefone", "email", "cpf_cnpj", "endereco", mode="before", check_fields=False
    )
    @classmethod
    def _vazio_para_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v


class ClienteBase(_NormalizaVaziosMixin, BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    telefone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=150)
    cpf_cnpj: str | None = Field(default=None, max_length=20)
    endereco: str | None = Field(default=None, max_length=255)


class ClienteCreate(ClienteBase):
    pass


class ClienteUpdate(_NormalizaVaziosMixin, BaseModel):
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
