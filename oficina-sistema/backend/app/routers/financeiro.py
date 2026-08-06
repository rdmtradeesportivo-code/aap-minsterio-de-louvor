"""Endpoints do domínio Financeiro (Módulo 5): categorias/centros de custo,
contas a pagar/receber. Restrito inteiramente a admin/financeiro — nem
recepção nem mecânico têm acesso a dados financeiros.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models.financeiro import CategoriaDespesa, CentroCusto, ContaPagar, ContaReceber
from app.schemas.financeiro import (
    CategoriaDespesaCreate,
    CategoriaDespesaOut,
    CentroCustoOut,
    ContaPagarCreate,
    ContaPagarOut,
    ContaPagarUpdate,
    ContaReceberOut,
)
from app.services import financeiro as financeiro_service

router = APIRouter(
    prefix="/api/financeiro",
    tags=["financeiro"],
    dependencies=[Depends(require_role("admin", "financeiro"))],
)


# ---------------------------------------------------------------------- #
# Categorias de despesa / Centros de custo
# ---------------------------------------------------------------------- #
@router.get("/categorias-despesa", response_model=list[CategoriaDespesaOut])
def listar_categorias_despesa(db: Session = Depends(get_db)) -> list[CategoriaDespesa]:
    return db.query(CategoriaDespesa).order_by(CategoriaDespesa.nome).all()


@router.post("/categorias-despesa", response_model=CategoriaDespesaOut, status_code=status.HTTP_201_CREATED)
def criar_categoria_despesa(payload: CategoriaDespesaCreate, db: Session = Depends(get_db)) -> CategoriaDespesa:
    categoria = CategoriaDespesa(**payload.model_dump())
    db.add(categoria)
    db.commit()
    db.refresh(categoria)
    return categoria


@router.get("/centros-custo", response_model=list[CentroCustoOut])
def listar_centros_custo(db: Session = Depends(get_db)) -> list[CentroCusto]:
    return db.query(CentroCusto).order_by(CentroCusto.nome).all()


# ---------------------------------------------------------------------- #
# Contas a Pagar
# ---------------------------------------------------------------------- #
@router.get("/contas-pagar", response_model=list[ContaPagarOut])
def listar_contas_pagar(
    status_filtro: str | None = None,
    categoria_id: int | None = None,
    db: Session = Depends(get_db),
) -> list[ContaPagar]:
    financeiro_service.atualizar_status_vencidos(db)
    query = db.query(ContaPagar)
    if status_filtro:
        query = query.filter(ContaPagar.status == status_filtro)
    if categoria_id:
        query = query.filter(ContaPagar.categoria_id == categoria_id)
    return query.order_by(ContaPagar.vencimento).all()


@router.post("/contas-pagar", response_model=ContaPagarOut, status_code=status.HTTP_201_CREATED)
def criar_conta_pagar(payload: ContaPagarCreate, db: Session = Depends(get_db)) -> ContaPagar:
    return financeiro_service.criar_conta_pagar(db, payload)


@router.put("/contas-pagar/{conta_id}", response_model=ContaPagarOut)
def atualizar_conta_pagar(conta_id: int, payload: ContaPagarUpdate, db: Session = Depends(get_db)) -> ContaPagar:
    return financeiro_service.atualizar_conta_pagar(db, conta_id, payload)


@router.post("/contas-pagar/{conta_id}/pagar", response_model=ContaPagarOut)
def pagar_conta_pagar(conta_id: int, db: Session = Depends(get_db)) -> ContaPagar:
    return financeiro_service.marcar_conta_pagar_paga(db, conta_id)


# ---------------------------------------------------------------------- #
# Contas a Receber
# ---------------------------------------------------------------------- #
@router.get("/contas-receber", response_model=list[ContaReceberOut])
def listar_contas_receber(
    status_filtro: str | None = None,
    cliente_id: int | None = None,
    db: Session = Depends(get_db),
) -> list[ContaReceber]:
    financeiro_service.atualizar_status_vencidos(db)
    query = db.query(ContaReceber)
    if status_filtro:
        query = query.filter(ContaReceber.status == status_filtro)
    if cliente_id:
        query = query.filter(ContaReceber.cliente_id == cliente_id)
    return query.order_by(ContaReceber.vencimento).all()


@router.post("/contas-receber/{conta_id}/receber", response_model=ContaReceberOut)
def receber_conta_receber(conta_id: int, db: Session = Depends(get_db)) -> ContaReceber:
    return financeiro_service.marcar_conta_receber_recebida(db, conta_id)
