"""Endpoints de Ordens de Serviço.

RBAC: `admin`/`financeiro` veem tudo; `recepcao` cria/edita OS (mas não
fatura — ação financeira, fica com admin/financeiro); `mecanico` só enxerga
(somente leitura) as OS em que ele é o responsável por algum item de
serviço ou está listado em `os_funcionarios` — nunca a lista inteira.
"""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.cliente import Cliente
from app.models.estoque import Peca
from app.models.financeiro import Funcionario
from app.models.ordem_servico import OrdemServico, OsFuncionario, OsItemServico
from app.models.usuario import Usuario
from app.models.veiculo import Veiculo
from app.schemas.ordem_servico import (
    FaturarRequest,
    ItemPecaCreate,
    ItemPecaOut,
    ItemServicoCreate,
    ItemServicoOut,
    OrdemServicoCreate,
    OrdemServicoDetalheOut,
    OrdemServicoResumoOut,
    OrdemServicoUpdate,
    OsFotoOut,
    OsFuncionarioCreate,
    OsFuncionarioOut,
    StatusUpdate,
)
from app.services import ordem_servico as os_service
from app.services import pdf as pdf_service

router = APIRouter(
    prefix="/api/ordens-servico",
    tags=["ordens de serviço"],
    dependencies=[Depends(get_current_user)],
)

# Recepção cria/edita OS; faturar é ação financeira (admin/financeiro).
gerenciar = Depends(require_role("admin", "financeiro", "recepcao"))
faturar_dep = Depends(require_role("admin", "financeiro"))


def _funcionario_do_usuario(db: Session, usuario_id: int) -> Funcionario | None:
    return db.query(Funcionario).filter(Funcionario.usuario_id == usuario_id).first()


def _query_visivel(db: Session, current_user: Usuario, *, eager: bool = False):
    """Aplica o filtro de visibilidade do mecânico à query de OS."""
    query = db.query(OrdemServico)
    if eager:
        query = query.options(
            selectinload(OrdemServico.cliente),
            selectinload(OrdemServico.veiculo),
            selectinload(OrdemServico.itens_peca),
            selectinload(OrdemServico.itens_servico),
            selectinload(OrdemServico.funcionarios),
            selectinload(OrdemServico.fotos),
            selectinload(OrdemServico.status_log),
        )
    else:
        query = query.options(
            selectinload(OrdemServico.cliente),
            selectinload(OrdemServico.veiculo),
            selectinload(OrdemServico.itens_peca),
            selectinload(OrdemServico.itens_servico),
        )

    if current_user.perfil != "mecanico":
        return query

    funcionario = _funcionario_do_usuario(db, current_user.id)
    if funcionario is None:
        return query.filter(False)  # mecânico sem cadastro de funcionário: não vê nenhuma OS

    return query.filter(
        or_(
            OrdemServico.id.in_(
                db.query(OsFuncionario.os_id).filter(OsFuncionario.funcionario_id == funcionario.id)
            ),
            OrdemServico.id.in_(
                db.query(OsItemServico.os_id).filter(
                    OsItemServico.funcionario_id == funcionario.id
                )
            ),
        )
    )


def _obter_os_visivel(db: Session, os_id: int, current_user: Usuario, *, eager: bool = False) -> OrdemServico:
    os_ = _query_visivel(db, current_user, eager=eager).filter(OrdemServico.id == os_id).first()
    if os_ is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ordem de serviço não encontrada")
    return os_


@router.get("", response_model=list[OrdemServicoResumoOut])
def listar_os(
    status_filtro: str | None = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> list[OrdemServico]:
    query = _query_visivel(db, current_user)
    if status_filtro:
        query = query.filter(OrdemServico.status == status_filtro)
    return query.order_by(OrdemServico.numero.desc()).all()


@router.post("", response_model=OrdemServicoDetalheOut, status_code=status.HTTP_201_CREATED, dependencies=[gerenciar])
def criar_os(
    payload: OrdemServicoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> OrdemServico:
    return os_service.criar_os(db, payload, current_user.id)


@router.get("/{os_id}", response_model=OrdemServicoDetalheOut)
def obter_os(
    os_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)
) -> OrdemServico:
    return _obter_os_visivel(db, os_id, current_user, eager=True)


@router.put("/{os_id}", response_model=OrdemServicoDetalheOut, dependencies=[gerenciar])
def atualizar_os(os_id: int, payload: OrdemServicoUpdate, db: Session = Depends(get_db)) -> OrdemServico:
    os_ = db.get(OrdemServico, os_id)
    if os_ is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ordem de serviço não encontrada")
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(os_, campo, valor)
    db.commit()
    db.refresh(os_)
    return os_


# ---------------------------------------------------------------------- #
# Itens de peça
# ---------------------------------------------------------------------- #
@router.post(
    "/{os_id}/itens-peca",
    response_model=ItemPecaOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[gerenciar],
)
def adicionar_item_peca(
    os_id: int,
    payload: ItemPecaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return os_service.adicionar_item_peca(db, os_id, payload, current_user.id)


@router.delete(
    "/{os_id}/itens-peca/{item_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[gerenciar]
)
def remover_item_peca(
    os_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> None:
    os_service.remover_item_peca(db, os_id, item_id, current_user.id)


# ---------------------------------------------------------------------- #
# Itens de serviço
# ---------------------------------------------------------------------- #
@router.post(
    "/{os_id}/itens-servico",
    response_model=ItemServicoOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[gerenciar],
)
def adicionar_item_servico(os_id: int, payload: ItemServicoCreate, db: Session = Depends(get_db)):
    return os_service.adicionar_item_servico(db, os_id, payload)


@router.delete(
    "/{os_id}/itens-servico/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[gerenciar],
)
def remover_item_servico(os_id: int, item_id: int, db: Session = Depends(get_db)) -> None:
    os_service.remover_item_servico(db, os_id, item_id)


# ---------------------------------------------------------------------- #
# Funcionários responsáveis
# ---------------------------------------------------------------------- #
@router.post(
    "/{os_id}/funcionarios",
    response_model=OsFuncionarioOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[gerenciar],
)
def adicionar_funcionario_os(os_id: int, payload: OsFuncionarioCreate, db: Session = Depends(get_db)):
    return os_service.adicionar_funcionario(db, os_id, payload)


# ---------------------------------------------------------------------- #
# Status / faturamento
# ---------------------------------------------------------------------- #
@router.post("/{os_id}/status", response_model=OrdemServicoDetalheOut, dependencies=[gerenciar])
def mudar_status_os(
    os_id: int,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return os_service.mudar_status(db, os_id, payload.novo_status, current_user.id)


@router.post("/{os_id}/faturar", response_model=OrdemServicoDetalheOut, dependencies=[faturar_dep])
def faturar_os(
    os_id: int,
    payload: FaturarRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return os_service.faturar_os(db, os_id, payload, current_user.id)


# ---------------------------------------------------------------------- #
# Fotos
# ---------------------------------------------------------------------- #
@router.post(
    "/{os_id}/fotos",
    response_model=OsFotoOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[gerenciar],
)
async def enviar_foto(
    os_id: int,
    tipo: str = Form(...),
    arquivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if tipo not in ("antes", "depois"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="tipo deve ser 'antes' ou 'depois'")
    conteudo = await arquivo.read()
    return os_service.adicionar_foto(db, os_id, tipo, arquivo.filename or "foto.jpg", conteudo)


# ---------------------------------------------------------------------- #
# PDF do orçamento
# ---------------------------------------------------------------------- #
@router.get("/{os_id}/pdf")
def gerar_pdf(
    os_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)
):
    os_ = _obter_os_visivel(db, os_id, current_user)

    cliente = db.get(Cliente, os_.cliente_id)
    veiculo = db.get(Veiculo, os_.veiculo_id)

    itens_peca = []
    for item in os_.itens_peca:
        peca = db.get(Peca, item.peca_id)
        itens_peca.append(
            {
                "descricao": peca.descricao if peca else f"Peça #{item.peca_id}",
                "quantidade": item.quantidade,
                "preco_unitario_venda": item.preco_unitario_venda,
                "subtotal": item.quantidade * item.preco_unitario_venda,
            }
        )

    valor_total = os_service.calcular_valor_total(os_)
    conteudo_pdf = pdf_service.gerar_pdf_orcamento(os_, cliente, veiculo, itens_peca, valor_total)

    return Response(
        content=conteudo_pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=orcamento-os-{os_.numero}.pdf"},
    )
