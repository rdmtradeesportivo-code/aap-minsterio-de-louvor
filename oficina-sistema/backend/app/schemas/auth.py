from pydantic import BaseModel

from app.schemas.usuario import UsuarioOut


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut
