"""Relatórios Gerais (Módulo 6): faturamento por período, lucro por OS,
inadimplência de clientes, ranking de serviços mais vendidos. Restrito a
admin/financeiro, mesmo padrão do resto do domínio financeiro.
"""

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.schemas.relatorios import (
    FaturamentoPeriodoOut,
    InadimplenciaClienteItem,
    LucroPorOsItem,
    RankingServicoItem,
)
from app.services import relatorios as relatorios_service

router = APIRouter(
    prefix="/api/relatorios",
    tags=["relatórios"],
    dependencies=[Depends(require_role("admin", "financeiro"))],
)


def _periodo_do_mes(mes: str | None) -> tuple[date, date]:
    from app.core.datas import primeiro_dia_do_mes, primeiro_dia_do_proximo_mes

    if mes:
        ano, m = mes.split("-")[:2]
        inicio = date(int(ano), int(m), 1)
    else:
        inicio = primeiro_dia_do_mes(date.today())
    return inicio, primeiro_dia_do_proximo_mes(inicio)


@router.get("/faturamento", response_model=FaturamentoPeriodoOut)
def faturamento_por_periodo(mes: str | None = None, db: Session = Depends(get_db)):
    inicio, fim = _periodo_do_mes(mes)
    return relatorios_service.faturamento_por_periodo(db, inicio, fim)


@router.get("/lucro-por-os", response_model=list[LucroPorOsItem])
def lucro_por_os(mes: str | None = None, db: Session = Depends(get_db)):
    inicio, fim = _periodo_do_mes(mes)
    return relatorios_service.lucro_por_os(db, inicio, fim)


@router.get("/inadimplencia", response_model=list[InadimplenciaClienteItem])
def inadimplencia_clientes(db: Session = Depends(get_db)):
    return relatorios_service.inadimplencia_clientes(db)


@router.get("/ranking-servicos", response_model=list[RankingServicoItem])
def ranking_servicos(mes: str | None = None, db: Session = Depends(get_db)):
    inicio, fim = _periodo_do_mes(mes)
    return relatorios_service.ranking_servicos(db, inicio, fim)
