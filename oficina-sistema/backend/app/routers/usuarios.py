from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.core.security import hash_password
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioOut, UsuarioUpdate

router = APIRouter(
    prefix="/api/usuarios",
    tags=["usuários"],
    # Somente Admin gerencia usuários (conforme regras de permissão do módulo 1)
    dependencies=[Depends(require_role("admin"))],
)


@router.get("", response_model=list[UsuarioOut])
def listar_usuarios(db: Session = Depends(get_db)) -> list[Usuario]:
    return db.query(Usuario).order_by(Usuario.nome).all()


@router.post("", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def criar_usuario(payload: UsuarioCreate, db: Session = Depends(get_db)) -> Usuario:
    if db.query(Usuario).filter(Usuario.email == payload.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="E-mail já cadastrado"
        )

    usuario = Usuario(
        nome=payload.nome,
        email=payload.email,
        perfil=payload.perfil,
        senha_hash=hash_password(payload.senha),
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.get("/{usuario_id}", response_model=UsuarioOut)
def obter_usuario(usuario_id: int, db: Session = Depends(get_db)) -> Usuario:
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    return usuario


@router.put("/{usuario_id}", response_model=UsuarioOut)
def atualizar_usuario(
    usuario_id: int, payload: UsuarioUpdate, db: Session = Depends(get_db)
) -> Usuario:
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    dados = payload.model_dump(exclude_unset=True)
    if "senha" in dados:
        senha = dados.pop("senha")
        if senha:
            usuario.senha_hash = hash_password(senha)
    for campo, valor in dados.items():
        setattr(usuario, campo, valor)

    db.commit()
    db.refresh(usuario)
    return usuario


@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def desativar_usuario(usuario_id: int, db: Session = Depends(get_db)) -> None:
    """Desativa o usuário (soft delete — nunca removemos o histórico)."""
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    usuario.ativo = False
    db.commit()
