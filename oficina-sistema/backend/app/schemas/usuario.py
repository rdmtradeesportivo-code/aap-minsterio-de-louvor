from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Perfil = Literal["admin", "financeiro", "recepcao", "mecanico"]


class UsuarioBase(BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    email: EmailStr
    perfil: Perfil


class UsuarioCreate(UsuarioBase):
    senha: str = Field(min_length=6, max_length=128)


class UsuarioUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=150)
    perfil: Perfil | None = None
    ativo: bool | None = None
    senha: str | None = Field(default=None, min_length=6, max_length=128)


class UsuarioOut(UsuarioBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ativo: bool
    criado_em: datetime
