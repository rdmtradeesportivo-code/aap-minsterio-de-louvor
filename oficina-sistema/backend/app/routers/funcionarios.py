"""Funcionários — cadastro mínimo necessário para o Módulo 4 (responsável
por item de serviço / comissão). CRUD completo (folha, descontos, etc.)
é o Módulo 5.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.financeiro import Funcionario
from app.schemas.financeiro import FuncionarioCreate, FuncionarioOut, FuncionarioUpdate

router = APIRouter(
    prefix="/api/funcionarios",
    tags=["funcionários"],
    dependencies=[Depends(get_current_user)],
)

gerenciar = Depends(require_role("admin", "financeiro"))


@router.get("", response_model=list[FuncionarioOut])
def listar_funcionarios(
    somente_ativos: bool = True, db: Session = Depends(get_db)
) -> list[Funcionario]:
    query = db.query(Funcionario)
    if somente_ativos:
        query = query.filter(Funcionario.ativo.is_(True))
    return query.order_by(Funcionario.nome).all()


@router.post("", response_model=FuncionarioOut, status_code=status.HTTP_201_CREATED, dependencies=[gerenciar])
def criar_funcionario(payload: FuncionarioCreate, db: Session = Depends(get_db)) -> Funcionario:
    funcionario = Funcionario(**payload.model_dump())
    db.add(funcionario)
    db.commit()
    db.refresh(funcionario)
    return funcionario


@router.put("/{funcionario_id}", response_model=FuncionarioOut, dependencies=[gerenciar])
def atualizar_funcionario(
    funcionario_id: int, payload: FuncionarioUpdate, db: Session = Depends(get_db)
) -> Funcionario:
    funcionario = db.get(Funcionario, funcionario_id)
    if funcionario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funcionário não encontrado")
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(funcionario, campo, valor)
    db.commit()
    db.refresh(funcionario)
    return funcionario
