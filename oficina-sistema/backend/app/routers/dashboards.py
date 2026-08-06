from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.schemas.relatorios import (
    DespesaPorCategoriaItem,
    DreOut,
    EvolucaoMensalItem,
    FluxoCaixaDia,
    OrcadoRealizadoItem,
    PontoEquilibrioOut,
)
from app.services import relatorios as relatorios_service

router = APIRouter(
    prefix="/api/financeiro/dashboards",
    tags=["financeiro"],
    dependencies=[Depends(require_role("admin", "financeiro"))],
)


def _parse_mes(valor: str | None) -> date:
    if not valor:
        return date.today().replace(day=1)
    ano, mes = valor.split("-")[:2]
    return date(int(ano), int(mes), 1)


@router.get("/dre", response_model=DreOut)
def dre(mes: str | None = None, db: Session = Depends(get_db)):
    return relatorios_service.calcular_dre_mes(db, _parse_mes(mes))


@router.get("/ponto-equilibrio", response_model=PontoEquilibrioOut)
def ponto_equilibrio(mes: str | None = None, db: Session = Depends(get_db)):
    return relatorios_service.calcular_ponto_equilibrio(db, _parse_mes(mes))


@router.get("/evolucao-mensal", response_model=list[EvolucaoMensalItem])
def evolucao_mensal(meses: int = 6, db: Session = Depends(get_db)):
    if meses < 1 or meses > 24:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="meses deve estar entre 1 e 24")
    return relatorios_service.evolucao_mensal(db, meses)


@router.get("/orcado-realizado", response_model=list[OrcadoRealizadoItem])
def orcado_realizado(mes: str | None = None, db: Session = Depends(get_db)):
    return relatorios_service.orcado_realizado(db, _parse_mes(mes))


@router.get("/despesas-por-categoria", response_model=list[DespesaPorCategoriaItem])
def despesas_por_categoria(mes: str | None = None, db: Session = Depends(get_db)):
    return relatorios_service.despesas_por_categoria(db, _parse_mes(mes))


@router.get("/fluxo-caixa", response_model=list[FluxoCaixaDia])
def fluxo_caixa(data_inicio: str | None = None, data_fim: str | None = None, db: Session = Depends(get_db)):
    fim = datetime.strptime(data_fim, "%Y-%m-%d").date() if data_fim else date.today() + timedelta(days=30)
    inicio = datetime.strptime(data_inicio, "%Y-%m-%d").date() if data_inicio else date.today() - timedelta(days=30)
    try:
        return relatorios_service.fluxo_caixa(db, inicio, fim)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
