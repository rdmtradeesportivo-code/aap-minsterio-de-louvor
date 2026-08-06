from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token, verify_password
from app.models.usuario import Usuario
from app.schemas.auth import Token
from app.schemas.usuario import UsuarioOut

router = APIRouter(prefix="/api/auth", tags=["autenticação"])


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Token:
    # OAuth2PasswordRequestForm usa o campo "username" — aqui ele carrega o e-mail
    usuario = db.query(Usuario).filter(Usuario.email == form_data.username).first()

    if usuario is None or not verify_password(form_data.password, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha inválidos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not usuario.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário desativado. Contate o administrador.",
        )

    access_token = create_access_token(
        subject=str(usuario.id), extra_claims={"perfil": usuario.perfil}
    )
    return Token(access_token=access_token, usuario=UsuarioOut.model_validate(usuario))


@router.get("/me", response_model=UsuarioOut)
def me(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    return current_user
