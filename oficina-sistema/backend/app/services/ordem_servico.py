"""Regras de negócio de Ordens de Serviço.

Três pontos deliberados aqui, por causa de riscos concretos apontados na
revisão do módulo:

1. Baixa de peça bloqueia se não houver estoque suficiente — mesma
   validação usada no ajuste manual do Módulo 3.
2. A peça é travada com `SELECT ... FOR UPDATE`
   (`estoque_service.obter_peca_para_mutacao`) antes de checar/decrementar
   o saldo, dentro da mesma transação do item da OS — evita que duas
   requisições concorrentes leiam o mesmo saldo e ambas passem na checagem
   (race condition clássica de check-then-act), o que deixaria o estoque
   negativo.
3. `valor_total` nunca é uma coluna que a aplicação escreve e depois lê de
   volta — é sempre recalculado a partir dos itens carregados
   (`calcular_valor_total`, usado tanto para exibição quanto para gerar o
   valor de `contas_receber` ao faturar).
"""

import uuid
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.models.cliente import Cliente
from app.models.estoque import MovimentacaoEstoque
from app.models.financeiro import Comissao, ContaReceber, Funcionario, RegraComissao
from app.models.ordem_servico import (
    STATUS_ANTES_DE_FATURAR,
    OrdemServico,
    OsFoto,
    OsFuncionario,
    OsItemPeca,
    OsItemServico,
    OsStatusLog,
)
from app.models.veiculo import Veiculo
from app.schemas.ordem_servico import (
    CancelarRequest,
    FaturarRequest,
    ItemPecaCreate,
    ItemServicoCreate,
    OrdemServicoCreate,
    OsFuncionarioCreate,
)
from app.services import estoque as estoque_service

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "os_fotos"

# Estados terminais em relação a itens: uma vez faturada, a OS não pode mais
# ter peças/serviços alterados (a conta a receber já foi gerada com base
# nesses itens). "cancelado" entra na mesma lista por consistência (embora
# cancelar_os já barre a transição por outro caminho).
STATUS_ITENS_BLOQUEADOS = ("faturado", "pago", "cancelado")

# Transições de status permitidas. "faturado" só é alcançável pelo endpoint
# dedicado de faturamento (valida itens e gera contas_receber), nunca pela
# troca de status genérica.
TRANSICOES_PERMITIDAS: dict[str, set[str]] = {
    "orcamento": {"aprovado"},
    "aprovado": {"em_execucao"},
    "em_execucao": {"aguardando_peca", "concluido"},
    "aguardando_peca": {"em_execucao"},
    "concluido": set(),  # daqui só via /faturar
    "faturado": {"pago"},
    "pago": set(),
}


def _os_ou_404(db: Session, os_id: int, *, com_itens: bool = False) -> OrdemServico:
    query = db.query(OrdemServico)
    if com_itens:
        query = query.options(
            selectinload(OrdemServico.itens_peca), selectinload(OrdemServico.itens_servico)
        )
    os_ = query.filter(OrdemServico.id == os_id).first()
    if os_ is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ordem de serviço não encontrada")
    return os_


def calcular_valor_total(os_: OrdemServico) -> Decimal:
    total_pecas = sum(
        (item.quantidade * item.preco_unitario_venda for item in os_.itens_peca), Decimal("0")
    )
    total_servicos = sum((item.valor for item in os_.itens_servico), Decimal("0"))
    return (total_pecas + total_servicos).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def criar_os(db: Session, payload: OrdemServicoCreate, usuario_id: int) -> OrdemServico:
    cliente = db.get(Cliente, payload.cliente_id)
    if cliente is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado")

    veiculo = db.get(Veiculo, payload.veiculo_id)
    if veiculo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Veículo não encontrado")
    if veiculo.cliente_id != cliente.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este veículo não pertence ao cliente informado",
        )

    os_ = OrdemServico(
        cliente_id=cliente.id,
        veiculo_id=veiculo.id,
        prazo_estimado=payload.prazo_estimado,
        forma_pagamento=payload.forma_pagamento,
        criado_por=usuario_id,
    )
    db.add(os_)
    db.flush()  # garante os_.id e os_.numero (gerado pela sequence do banco)

    db.add(
        OsStatusLog(
            os_id=os_.id, status_anterior=None, status_novo="orcamento", usuario_id=usuario_id
        )
    )
    db.commit()
    db.refresh(os_)
    return os_


# ---------------------------------------------------------------------- #
# Itens de peça — ponto central dos riscos 1 e 2 (estoque insuficiente e
# concorrência).
# ---------------------------------------------------------------------- #
def adicionar_item_peca(
    db: Session, os_id: int, payload: ItemPecaCreate, usuario_id: int
) -> OsItemPeca:
    os_ = _os_ou_404(db, os_id)
    if os_.status in STATUS_ITENS_BLOQUEADOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OS já faturada — itens não podem mais ser alterados",
        )

    # Trava a linha da peça (FOR UPDATE) antes de checar o saldo: se outra
    # requisição estiver processando uma baixa na mesma peça, esta espera a
    # transação concorrente terminar e só então lê o saldo já atualizado.
    peca = estoque_service.obter_peca_para_mutacao(db, payload.peca_id)

    if peca.estoque_atual < payload.quantidade:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Estoque insuficiente para {peca.descricao} "
                f"(disponível: {peca.estoque_atual}, solicitado: {payload.quantidade})"
            ),
        )

    preco_unitario_venda = (
        payload.preco_unitario_venda if payload.preco_unitario_venda is not None else peca.preco_venda
    )

    item = OsItemPeca(
        os_id=os_.id,
        peca_id=peca.id,
        quantidade=payload.quantidade,
        preco_unitario_venda=preco_unitario_venda,
        custo_unitario=peca.custo_compra,  # snapshot — não muda se o custo da peça mudar depois
    )
    db.add(item)

    db.add(
        MovimentacaoEstoque(
            peca_id=peca.id,
            tipo="saida",
            quantidade=payload.quantidade,
            os_id=os_.id,
            usuario_id=usuario_id,
        )
    )
    peca.estoque_atual = peca.estoque_atual - payload.quantidade

    db.commit()
    db.refresh(item)
    return item


def remover_item_peca(db: Session, os_id: int, item_id: int, usuario_id: int) -> None:
    os_ = _os_ou_404(db, os_id)
    if os_.status in STATUS_ITENS_BLOQUEADOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OS já faturada — itens não podem mais ser alterados",
        )

    item = (
        db.query(OsItemPeca).filter(OsItemPeca.id == item_id, OsItemPeca.os_id == os_.id).first()
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item não encontrado")

    peca = estoque_service.obter_peca_para_mutacao(db, item.peca_id)
    peca.estoque_atual = peca.estoque_atual + item.quantidade

    db.add(
        MovimentacaoEstoque(
            peca_id=peca.id,
            tipo="ajuste",
            quantidade=item.quantidade,
            motivo=f"Estorno de item removido da OS #{os_.numero}",
            os_id=os_.id,
            usuario_id=usuario_id,
        )
    )
    db.delete(item)
    db.commit()


# ---------------------------------------------------------------------- #
# Itens de serviço (mão de obra)
# ---------------------------------------------------------------------- #
def adicionar_item_servico(db: Session, os_id: int, payload: ItemServicoCreate) -> OsItemServico:
    os_ = _os_ou_404(db, os_id)
    if os_.status in STATUS_ITENS_BLOQUEADOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OS já faturada — itens não podem mais ser alterados",
        )
    if payload.funcionario_id is not None and db.get(Funcionario, payload.funcionario_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funcionário não encontrado")

    item = OsItemServico(
        os_id=os_.id,
        descricao=payload.descricao,
        valor=payload.valor,
        funcionario_id=payload.funcionario_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def remover_item_servico(db: Session, os_id: int, item_id: int) -> None:
    os_ = _os_ou_404(db, os_id)
    if os_.status in STATUS_ITENS_BLOQUEADOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OS já faturada — itens não podem mais ser alterados",
        )

    item = (
        db.query(OsItemServico)
        .filter(OsItemServico.id == item_id, OsItemServico.os_id == os_.id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item não encontrado")

    db.delete(item)
    db.commit()


def adicionar_funcionario(db: Session, os_id: int, payload: OsFuncionarioCreate) -> OsFuncionario:
    os_ = _os_ou_404(db, os_id)
    if db.get(Funcionario, payload.funcionario_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funcionário não encontrado")

    os_func = OsFuncionario(os_id=os_.id, funcionario_id=payload.funcionario_id, papel=payload.papel)
    db.add(os_func)
    db.commit()
    db.refresh(os_func)
    return os_func


# ---------------------------------------------------------------------- #
# Fluxo de status
# ---------------------------------------------------------------------- #
def mudar_status(db: Session, os_id: int, novo_status: str, usuario_id: int) -> OrdemServico:
    os_ = _os_ou_404(db, os_id, com_itens=True)

    if novo_status == "faturado":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use o endpoint de faturamento (POST /api/ordens-servico/{id}/faturar)",
        )
    if novo_status == "cancelado":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use o endpoint de cancelamento (POST /api/ordens-servico/{id}/cancelar)",
        )

    permitidos = TRANSICOES_PERMITIDAS.get(os_.status, set())
    if novo_status not in permitidos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transição de status inválida: {os_.status} → {novo_status}",
        )

    status_anterior = os_.status

    if novo_status == "concluido":
        _calcular_comissoes(db, os_)

    os_.status = novo_status
    db.add(
        OsStatusLog(
            os_id=os_.id,
            status_anterior=status_anterior,
            status_novo=novo_status,
            usuario_id=usuario_id,
        )
    )
    db.commit()
    db.refresh(os_)
    return os_


def cancelar_os(
    db: Session, os_id: int, payload: CancelarRequest, usuario_id: int
) -> OrdemServico:
    """Cancela a OS. Permitido em qualquer status anterior a "faturado" —
    depois de faturada, não cancela mais (só existiria estorno/nota de
    crédito, fora de escopo por ora).

    Efeitos colaterais, ambos deliberados:
    - Estoque já baixado (itens de peça) é estornado, na mesma lógica de
      `remover_item_peca` — mas os itens NÃO são apagados, ficam no
      histórico da OS cancelada para auditoria.
    - Comissões já calculadas (ex: cancelamento depois de "concluido", antes
      de faturar) são zeradas — a linha continua existindo para auditoria,
      mas com valor 0, então nunca entra em soma de fechamento de folha ou
      de DRE (que somam `comissoes.valor`).
    """
    os_ = _os_ou_404(db, os_id, com_itens=True)

    if os_.status not in STATUS_ANTES_DE_FATURAR:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Só é possível cancelar uma OS antes de faturada (status atual: {os_.status})",
        )

    for item in os_.itens_peca:
        peca = estoque_service.obter_peca_para_mutacao(db, item.peca_id)
        peca.estoque_atual = peca.estoque_atual + item.quantidade
        db.add(
            MovimentacaoEstoque(
                peca_id=peca.id,
                tipo="ajuste",
                quantidade=item.quantidade,
                motivo=f"Estorno por cancelamento da OS #{os_.numero}",
                os_id=os_.id,
                usuario_id=usuario_id,
            )
        )

    for comissao in db.query(Comissao).filter(Comissao.os_id == os_.id).all():
        comissao.valor = Decimal("0")

    status_anterior = os_.status
    os_.status = "cancelado"
    db.add(
        OsStatusLog(
            os_id=os_.id,
            status_anterior=status_anterior,
            status_novo="cancelado",
            usuario_id=usuario_id,
            motivo=payload.motivo,
        )
    )
    db.commit()
    db.refresh(os_)
    return os_


def adicionar_foto(
    db: Session, os_id: int, tipo: str, nome_original: str, conteudo: bytes
) -> OsFoto:
    os_ = _os_ou_404(db, os_id)

    extensao = Path(nome_original).suffix.lower() or ".jpg"
    nome_arquivo = f"{uuid.uuid4().hex}{extensao}"
    diretorio_os = UPLOAD_DIR / str(os_.id)
    diretorio_os.mkdir(parents=True, exist_ok=True)
    (diretorio_os / nome_arquivo).write_bytes(conteudo)

    # Caminho relativo, servido em /uploads/os_fotos/<os_id>/<arquivo> (ver
    # o StaticFiles montado em app/main.py).
    caminho_relativo = f"os_fotos/{os_.id}/{nome_arquivo}"

    foto = OsFoto(os_id=os_.id, tipo=tipo, caminho_arquivo=caminho_relativo)
    db.add(foto)
    db.commit()
    db.refresh(foto)
    return foto


def _calcular_comissoes(db: Session, os_: OrdemServico) -> None:
    # Idempotente: se a OS voltar a passar por aqui (não deveria, dado o
    # mapa de transições, mas por segurança) não duplica comissão.
    ja_calculada = db.query(Comissao).filter(Comissao.os_id == os_.id).first()
    if ja_calculada is not None:
        return

    for item in os_.itens_servico:
        if item.funcionario_id is None:
            continue

        regra = (
            db.query(RegraComissao)
            .filter(
                RegraComissao.funcionario_id == item.funcionario_id,
                RegraComissao.categoria_peca_id.is_(None),
            )
            .first()
        )
        if regra is not None:
            percentual = regra.percentual
        else:
            funcionario = db.get(Funcionario, item.funcionario_id)
            percentual = funcionario.percentual_comissao_padrao if funcionario else Decimal("0")

        valor_comissao = (item.valor * percentual / Decimal("100")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        db.add(
            Comissao(
                os_id=os_.id,
                funcionario_id=item.funcionario_id,
                valor=valor_comissao,
                percentual_aplicado=percentual,
            )
        )


def faturar_os(
    db: Session, os_id: int, payload: FaturarRequest, usuario_id: int
) -> OrdemServico:
    os_ = _os_ou_404(db, os_id, com_itens=True)

    if os_.status != "concluido":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A OS precisa estar 'concluido' para ser faturada",
        )
    if not os_.itens_peca and not os_.itens_servico:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uma OS só pode ser faturada com pelo menos um item (peça ou serviço) definido",
        )

    valor_total = calcular_valor_total(os_)
    n = payload.numero_parcelas
    valor_parcela = (valor_total / n).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    # A última parcela absorve o resíduo de arredondamento, para a soma das
    # parcelas bater exatamente com valor_total.
    valor_ultima_parcela = valor_total - valor_parcela * (n - 1)

    hoje = date.today()
    for i in range(1, n + 1):
        valor = valor_parcela if i < n else valor_ultima_parcela
        db.add(
            ContaReceber(
                cliente_id=os_.cliente_id,
                os_id=os_.id,
                descricao=f"OS #{os_.numero}" + (f" — parcela {i}/{n}" if n > 1 else ""),
                valor=valor,
                vencimento=hoje + timedelta(days=30 * i),
                status="pendente",
                numero_parcela=i,
                total_parcelas=n,
            )
        )

    status_anterior = os_.status
    os_.status = "faturado"
    db.add(
        OsStatusLog(
            os_id=os_.id, status_anterior=status_anterior, status_novo="faturado", usuario_id=usuario_id
        )
    )
    db.commit()
    db.refresh(os_)
    return os_
