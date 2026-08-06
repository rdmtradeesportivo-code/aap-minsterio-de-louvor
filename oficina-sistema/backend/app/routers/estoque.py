"""Endpoints do domínio Estoque de Peças.

Consulta (GET) é liberada para qualquer usuário autenticado — inclusive
mecânico, que precisa conferir disponibilidade de peça antes de iniciar um
serviço. Cadastro/edição de fornecedores, categorias, peças e qualquer
movimentação (que mexe em estoque e pode gerar contas a pagar) é restrito a
admin/financeiro.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.estoque import CategoriaPeca, Fornecedor, MovimentacaoEstoque, Peca
from app.models.usuario import Usuario
from app.schemas.estoque import (
    AjusteEstoqueCreate,
    CategoriaPecaCreate,
    CategoriaPecaOut,
    EntradaEstoqueCreate,
    FornecedorCreate,
    FornecedorOut,
    FornecedorUpdate,
    MovimentacaoEstoqueOut,
    PecaCreate,
    PecaOut,
    PecaUpdate,
)
from app.services import estoque as estoque_service

gerenciar = Depends(require_role("admin", "financeiro"))

router_fornecedores = APIRouter(
    prefix="/api/fornecedores",
    tags=["estoque"],
    dependencies=[Depends(get_current_user)],
)
router_categorias_peca = APIRouter(
    prefix="/api/categorias-peca",
    tags=["estoque"],
    dependencies=[Depends(get_current_user)],
)
router_pecas = APIRouter(
    prefix="/api/pecas",
    tags=["estoque"],
    dependencies=[Depends(get_current_user)],
)
router_movimentacoes = APIRouter(
    prefix="/api/estoque/movimentacoes",
    tags=["estoque"],
    dependencies=[Depends(get_current_user)],
)


# ---------------------------------------------------------------------- #
# Fornecedores
# ---------------------------------------------------------------------- #
@router_fornecedores.get("", response_model=list[FornecedorOut])
def listar_fornecedores(db: Session = Depends(get_db)) -> list[Fornecedor]:
    return db.query(Fornecedor).order_by(Fornecedor.nome).all()


@router_fornecedores.post(
    "", response_model=FornecedorOut, status_code=status.HTTP_201_CREATED, dependencies=[gerenciar]
)
def criar_fornecedor(payload: FornecedorCreate, db: Session = Depends(get_db)) -> Fornecedor:
    fornecedor = Fornecedor(**payload.model_dump())
    db.add(fornecedor)
    db.commit()
    db.refresh(fornecedor)
    return fornecedor


@router_fornecedores.put(
    "/{fornecedor_id}", response_model=FornecedorOut, dependencies=[gerenciar]
)
def atualizar_fornecedor(
    fornecedor_id: int, payload: FornecedorUpdate, db: Session = Depends(get_db)
) -> Fornecedor:
    fornecedor = db.get(Fornecedor, fornecedor_id)
    if fornecedor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fornecedor não encontrado")
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(fornecedor, campo, valor)
    db.commit()
    db.refresh(fornecedor)
    return fornecedor


# ---------------------------------------------------------------------- #
# Categorias de peça
# ---------------------------------------------------------------------- #
@router_categorias_peca.get("", response_model=list[CategoriaPecaOut])
def listar_categorias_peca(db: Session = Depends(get_db)) -> list[CategoriaPeca]:
    return db.query(CategoriaPeca).order_by(CategoriaPeca.nome).all()


@router_categorias_peca.post(
    "", response_model=CategoriaPecaOut, status_code=status.HTTP_201_CREATED, dependencies=[gerenciar]
)
def criar_categoria_peca(payload: CategoriaPecaCreate, db: Session = Depends(get_db)) -> CategoriaPeca:
    categoria = CategoriaPeca(**payload.model_dump())
    db.add(categoria)
    db.commit()
    db.refresh(categoria)
    return categoria


# ---------------------------------------------------------------------- #
# Peças
# ---------------------------------------------------------------------- #
@router_pecas.get("", response_model=list[PecaOut])
def listar_pecas(
    busca: str | None = None,
    somente_estoque_baixo: bool = False,
    db: Session = Depends(get_db),
) -> list[Peca]:
    query = db.query(Peca)
    if busca:
        termo = f"%{busca}%"
        query = query.filter((Peca.codigo.ilike(termo)) | (Peca.descricao.ilike(termo)))
    pecas = query.order_by(Peca.descricao).all()
    if somente_estoque_baixo:
        pecas = [p for p in pecas if p.estoque_atual <= p.estoque_minimo]
    return pecas


@router_pecas.post(
    "", response_model=PecaOut, status_code=status.HTTP_201_CREATED, dependencies=[gerenciar]
)
def criar_peca(payload: PecaCreate, db: Session = Depends(get_db)) -> Peca:
    peca = Peca(**payload.model_dump())  # estoque_atual começa em 0 (default do model)
    db.add(peca)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Código já cadastrado")
    db.refresh(peca)
    return peca


@router_pecas.get("/{peca_id}", response_model=PecaOut)
def obter_peca(peca_id: int, db: Session = Depends(get_db)) -> Peca:
    peca = db.get(Peca, peca_id)
    if peca is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Peça não encontrada")
    return peca


@router_pecas.put("/{peca_id}", response_model=PecaOut, dependencies=[gerenciar])
def atualizar_peca(peca_id: int, payload: PecaUpdate, db: Session = Depends(get_db)) -> Peca:
    peca = db.get(Peca, peca_id)
    if peca is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Peça não encontrada")
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(peca, campo, valor)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Código já cadastrado")
    db.refresh(peca)
    return peca


@router_pecas.get("/{peca_id}/movimentacoes", response_model=list[MovimentacaoEstoqueOut])
def listar_movimentacoes_da_peca(peca_id: int, db: Session = Depends(get_db)) -> list[MovimentacaoEstoque]:
    if db.get(Peca, peca_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Peça não encontrada")
    return (
        db.query(MovimentacaoEstoque)
        .filter(MovimentacaoEstoque.peca_id == peca_id)
        .order_by(MovimentacaoEstoque.criado_em.desc())
        .all()
    )


# ---------------------------------------------------------------------- #
# Movimentações (entrada / ajuste — "saida" chega no Módulo 4, vinculada a OS)
# ---------------------------------------------------------------------- #
@router_movimentacoes.post(
    "/entrada",
    response_model=MovimentacaoEstoqueOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[gerenciar],
)
def registrar_entrada(
    payload: EntradaEstoqueCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> MovimentacaoEstoque:
    return estoque_service.registrar_entrada(db, payload, current_user.id)


@router_movimentacoes.post(
    "/ajuste",
    response_model=MovimentacaoEstoqueOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[gerenciar],
)
def registrar_ajuste(
    payload: AjusteEstoqueCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> MovimentacaoEstoque:
    return estoque_service.registrar_ajuste(db, payload, current_user.id)
