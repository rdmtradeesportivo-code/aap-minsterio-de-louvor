"""Fechamento de Folha de Pagamento.

Ponto crítico pedido explicitamente na revisão: **o fechamento precisa ser
idempotente — reprocessar não pode gerar comissão duplicada.** Duas
camadas garantem isso:

1. `fechar_folha` trava a linha da folha (`SELECT ... FOR UPDATE`) e, dentro
   dessa transação, confere `status == 'aberto'` antes de processar
   qualquer coisa. Se já estiver `fechado`/`pago`, levanta 400 e não toca em
   nada. Duas chamadas concorrentes na MESMA folha: a segunda fica
   bloqueada esperando a primeira commitar, então lê o status já
   atualizado (`fechado`) e é rejeitada — nunca as duas processam.
2. A soma de comissões do período só considera `comissoes.folha_id IS
   NULL` (ainda não vinculadas a nenhuma folha) e, ao fechar, cada uma é
   marcada com `folha_id = folha.id` — então mesmo que existisse algum
   caminho para reprocessar, não haveria mais comissão "solta" para somar
   de novo. A constraint UNIQUE(funcionario_id, mes_referencia) em
   `folha_pagamento` impede ainda uma segunda folha para o mesmo período.
"""

from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.datas import primeiro_dia_do_mes, primeiro_dia_do_proximo_mes
from app.models.financeiro import (
    CategoriaDespesa,
    Comissao,
    ContaPagar,
    FolhaDesconto,
    FolhaPagamento,
    Funcionario,
)
from app.schemas.financeiro import FolhaDescontoCreate, FolhaPagamentoCreate

NOME_CATEGORIA_PESSOAL = "Pessoal"


def _garantir_categoria_pessoal(db: Session) -> CategoriaDespesa:
    categoria = (
        db.query(CategoriaDespesa).filter(CategoriaDespesa.nome == NOME_CATEGORIA_PESSOAL).first()
    )
    if categoria is None:
        categoria = CategoriaDespesa(nome=NOME_CATEGORIA_PESSOAL, tipo="pessoal")
        db.add(categoria)
        db.flush()
    return categoria


def abrir_folha(db: Session, payload: FolhaPagamentoCreate) -> FolhaPagamento:
    funcionario = db.get(Funcionario, payload.funcionario_id)
    if funcionario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funcionário não encontrado")

    mes_referencia = primeiro_dia_do_mes(payload.mes_referencia)

    existente = (
        db.query(FolhaPagamento)
        .filter(
            FolhaPagamento.funcionario_id == funcionario.id,
            FolhaPagamento.mes_referencia == mes_referencia,
        )
        .first()
    )
    if existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe folha para este funcionário em {mes_referencia:%m/%Y}",
        )

    folha = FolhaPagamento(
        funcionario_id=funcionario.id,
        mes_referencia=mes_referencia,
        salario_base=funcionario.salario_base,
        total_comissoes=Decimal("0"),
        total_descontos=Decimal("0"),
        valor_liquido=funcionario.salario_base,
        status="aberto",
    )
    db.add(folha)
    db.commit()
    db.refresh(folha)
    return folha


def adicionar_desconto(db: Session, folha_id: int, payload: FolhaDescontoCreate) -> FolhaDesconto:
    folha = db.get(FolhaPagamento, folha_id)
    if folha is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folha não encontrada")
    if folha.status != "aberto":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Folha já fechada")

    desconto = FolhaDesconto(folha_id=folha.id, descricao=payload.descricao, valor=payload.valor)
    db.add(desconto)
    db.commit()
    db.refresh(desconto)
    return desconto


def fechar_folha(db: Session, folha_id: int) -> FolhaPagamento:
    # Trava a linha antes de checar o status — mesma técnica de
    # SELECT ... FOR UPDATE usada em app/services/estoque.py, aqui aplicada
    # para blindar o fechamento contra reprocessamento concorrente.
    folha = db.query(FolhaPagamento).filter(FolhaPagamento.id == folha_id).with_for_update().first()
    if folha is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folha não encontrada")
    if folha.status != "aberto":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Folha já está '{folha.status}' — fechamento não pode ser reprocessado",
        )

    inicio_periodo = folha.mes_referencia
    fim_periodo = primeiro_dia_do_proximo_mes(inicio_periodo)

    comissoes = (
        db.query(Comissao)
        .filter(
            Comissao.funcionario_id == folha.funcionario_id,
            Comissao.folha_id.is_(None),
            Comissao.data_calculo >= inicio_periodo,
            Comissao.data_calculo < fim_periodo,
        )
        .all()
    )
    total_comissoes = sum((c.valor for c in comissoes), Decimal("0"))

    descontos = db.query(FolhaDesconto).filter(FolhaDesconto.folha_id == folha.id).all()
    total_descontos = sum((d.valor for d in descontos), Decimal("0"))

    valor_liquido = (folha.salario_base + total_comissoes - total_descontos).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    valor_conta = max(valor_liquido, Decimal("0"))

    categoria_pessoal = _garantir_categoria_pessoal(db)
    conta_pagar = ContaPagar(
        descricao=f"Folha de pagamento — funcionário #{folha.funcionario_id} — {inicio_periodo:%m/%Y}",
        categoria_id=categoria_pessoal.id,
        valor=valor_conta,
        vencimento=fim_periodo.replace(day=5),  # dia 5 do mês seguinte ao de referência
        status="pendente",
        origem="folha",
    )
    db.add(conta_pagar)
    db.flush()  # garante conta_pagar.id

    for comissao in comissoes:
        comissao.folha_id = folha.id

    folha.total_comissoes = total_comissoes
    folha.total_descontos = total_descontos
    folha.valor_liquido = valor_liquido
    folha.status = "fechado"
    folha.data_fechamento = date.today()
    folha.conta_pagar_id = conta_pagar.id

    db.commit()
    db.refresh(folha)
    return folha


def pagar_folha(db: Session, folha_id: int) -> FolhaPagamento:
    folha = db.get(FolhaPagamento, folha_id)
    if folha is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folha não encontrada")
    if folha.status != "fechado":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Só é possível pagar uma folha fechada"
        )

    folha.status = "pago"
    if folha.conta_pagar_id:
        conta = db.get(ContaPagar, folha.conta_pagar_id)
        if conta is not None and conta.status != "pago":
            conta.status = "pago"
            conta.data_pagamento = date.today()

    db.commit()
    db.refresh(folha)
    return folha
