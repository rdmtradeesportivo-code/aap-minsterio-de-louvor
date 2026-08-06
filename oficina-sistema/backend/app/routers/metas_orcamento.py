from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.datas import primeiro_dia_do_mes
from app.core.deps import require_role
from app.models.financeiro import MetaOrcamento
from app.schemas.financeiro import MetaOrcamentoCreate, MetaOrcamentoOut

router = APIRouter(
    prefix="/api/financeiro/metas-orcamento",
    tags=["financeiro"],
    dependencies=[Depends(require_role("admin", "financeiro"))],
)


def _parse_mes(valor: str) -> date:
    ano, mes = valor.split("-")[:2]
    return date(int(ano), int(mes), 1)


@router.get("", response_model=list[MetaOrcamentoOut])
def listar_metas(mes_referencia: str | None = None, db: Session = Depends(get_db)) -> list[MetaOrcamento]:
    query = db.query(MetaOrcamento)
    if mes_referencia:
        query = query.filter(MetaOrcamento.mes_referencia == _parse_mes(mes_referencia))
    return query.order_by(MetaOrcamento.mes_referencia.desc()).all()


@router.post("", response_model=MetaOrcamentoOut, status_code=status.HTTP_201_CREATED)
def criar_meta(payload: MetaOrcamentoCreate, db: Session = Depends(get_db)) -> MetaOrcamento:
    meta = MetaOrcamento(
        categoria_id=payload.categoria_id,
        mes_referencia=primeiro_dia_do_mes(payload.mes_referencia),
        valor_meta=payload.valor_meta,
    )
    db.add(meta)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe meta para esta categoria neste mês",
        )
    db.refresh(meta)
    return meta
