"""Regras de negócio de Contas a Pagar / Contas a Receber (lançamento
manual e baixa). Geração automática continua nos módulos que já existiam
(app/services/estoque.py para compra de peça, app/services/ordem_servico.py
para faturamento) — este arquivo cobre o que falta para o módulo
financeiro ficar completo: lançamento manual e marcar como pago/recebido.
"""

from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.financeiro import CategoriaDespesa, ContaPagar, ContaReceber
from app.schemas.financeiro import ContaPagarCreate, ContaPagarUpdate


def atualizar_status_vencidos(db: Session) -> None:
    """Marca como 'atrasado' qualquer conta pendente cujo vencimento já
    passou — chamado antes de qualquer listagem/relatório para que o status
    reflita a realidade sem depender de um job agendado."""
    hoje = date.today()
    db.query(ContaPagar).filter(ContaPagar.status == "pendente", ContaPagar.vencimento < hoje).update(
        {"status": "atrasado"}, synchronize_session=False
    )
    db.query(ContaReceber).filter(
        ContaReceber.status == "pendente", ContaReceber.vencimento < hoje
    ).update({"status": "atrasado"}, synchronize_session=False)
    db.commit()


def criar_conta_pagar(db: Session, payload: ContaPagarCreate) -> ContaPagar:
    if db.get(CategoriaDespesa, payload.categoria_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria de despesa não encontrada")

    conta = ContaPagar(**payload.model_dump(), status="pendente", origem="manual")
    db.add(conta)
    db.commit()
    db.refresh(conta)
    return conta


def atualizar_conta_pagar(db: Session, conta_id: int, payload: ContaPagarUpdate) -> ContaPagar:
    conta = db.get(ContaPagar, conta_id)
    if conta is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta a pagar não encontrada")
    if conta.status != "pendente" and conta.status != "atrasado":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Só é possível editar uma conta pendente"
        )

    dados = payload.model_dump(exclude_unset=True)
    if "categoria_id" in dados and db.get(CategoriaDespesa, dados["categoria_id"]) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria de despesa não encontrada")

    for campo, valor in dados.items():
        setattr(conta, campo, valor)
    db.commit()
    db.refresh(conta)
    return conta


def marcar_conta_pagar_paga(db: Session, conta_id: int) -> ContaPagar:
    conta = db.get(ContaPagar, conta_id)
    if conta is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta a pagar não encontrada")
    if conta.status == "pago":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Conta já está paga")

    conta.status = "pago"
    conta.data_pagamento = date.today()
    db.commit()
    db.refresh(conta)
    return conta


def marcar_conta_receber_recebida(db: Session, conta_id: int) -> ContaReceber:
    conta = db.get(ContaReceber, conta_id)
    if conta is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta a receber não encontrada")
    if conta.status == "recebido":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Conta já está recebida")

    conta.status = "recebido"
    conta.data_recebimento = date.today()
    db.commit()
    db.refresh(conta)
    return conta
