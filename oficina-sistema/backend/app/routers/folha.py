from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import require_role
from app.models.financeiro import FolhaPagamento
from app.schemas.financeiro import (
    FolhaDescontoCreate,
    FolhaDescontoOut,
    FolhaPagamentoCreate,
    FolhaPagamentoOut,
)
from app.services import folha as folha_service

router = APIRouter(
    prefix="/api/folha",
    tags=["folha de pagamento"],
    dependencies=[Depends(require_role("admin", "financeiro"))],
)


@router.get("", response_model=list[FolhaPagamentoOut])
def listar_folhas(
    funcionario_id: int | None = None, db: Session = Depends(get_db)
) -> list[FolhaPagamento]:
    query = db.query(FolhaPagamento).options(selectinload(FolhaPagamento.descontos))
    if funcionario_id:
        query = query.filter(FolhaPagamento.funcionario_id == funcionario_id)
    return query.order_by(FolhaPagamento.mes_referencia.desc()).all()


@router.post("", response_model=FolhaPagamentoOut, status_code=201)
def abrir_folha(payload: FolhaPagamentoCreate, db: Session = Depends(get_db)) -> FolhaPagamento:
    return folha_service.abrir_folha(db, payload)


@router.post("/{folha_id}/descontos", response_model=FolhaDescontoOut, status_code=201)
def adicionar_desconto(folha_id: int, payload: FolhaDescontoCreate, db: Session = Depends(get_db)):
    return folha_service.adicionar_desconto(db, folha_id, payload)


@router.post("/{folha_id}/fechar", response_model=FolhaPagamentoOut)
def fechar_folha(folha_id: int, db: Session = Depends(get_db)) -> FolhaPagamento:
    return folha_service.fechar_folha(db, folha_id)


@router.post("/{folha_id}/pagar", response_model=FolhaPagamentoOut)
def pagar_folha(folha_id: int, db: Session = Depends(get_db)) -> FolhaPagamento:
    return folha_service.pagar_folha(db, folha_id)
