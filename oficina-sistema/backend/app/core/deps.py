from collections.abc import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.usuario import Usuario

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.get(Usuario, int(user_id))
    if user is None or not user.ativo:
        raise credentials_exception

    return user


def require_role(*perfis_permitidos: str):
    """Dependency factory: restringe o endpoint aos perfis informados.

    Uso: `Depends(require_role("admin", "financeiro"))`
    """

    def checker(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        if current_user.perfil not in perfis_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para acessar este recurso",
            )
        return current_user

    return checker


__all__ = ["get_db", "get_current_user", "require_role"]
