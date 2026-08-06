"""Regras de negócio do Estoque de Peças.

Centraliza a única forma de alterar `Peca.estoque_atual`: através de uma
movimentação registrada (entrada, ajuste ou, no Módulo 4, saída vinculada a
uma OS). Isso é o que a regra de negócio pede — "baixa de estoque... deve
ser automática, nunca lançada manualmente em paralelo" — então nenhum
router deve tocar em `estoque_atual` diretamente, sempre por aqui.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.estoque import MovimentacaoEstoque, Peca
from app.models.financeiro import CategoriaDespesa, ContaPagar
from app.schemas.estoque import AjusteEstoqueCreate, EntradaEstoqueCreate

NOME_CATEGORIA_PECAS_INSUMOS = "Peças e Insumos"


def obter_peca_para_mutacao(db: Session, peca_id: int) -> Peca:
    """Busca a peça travando a linha (`SELECT ... FOR UPDATE`) — usado por
    toda operação que lê e depois escreve `estoque_atual` (entrada, ajuste,
    saída por OS). Sem o lock, duas requisições concorrentes podem ler o
    mesmo saldo, ambas passarem na checagem de saldo suficiente e o
    resultado final ficar negativo (race condition clássica de
    check-then-act). Com `FOR UPDATE`, a segunda transação bloqueia até a
    primeira commitar/dar rollback, e então lê o saldo já atualizado.
    """
    peca = (
        db.query(Peca).filter(Peca.id == peca_id).with_for_update().first()
    )
    if peca is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Peça não encontrada")
    return peca


def _obter_peca_ou_404(db: Session, peca_id: int) -> Peca:
    return obter_peca_para_mutacao(db, peca_id)


def _garantir_categoria_pecas_insumos(db: Session) -> CategoriaDespesa:
    """Get-or-create da categoria de despesa usada por entradas de estoque
    quando nenhuma categoria é informada explicitamente."""
    categoria = (
        db.query(CategoriaDespesa)
        .filter(CategoriaDespesa.nome == NOME_CATEGORIA_PECAS_INSUMOS)
        .first()
    )
    if categoria is None:
        categoria = CategoriaDespesa(nome=NOME_CATEGORIA_PECAS_INSUMOS, tipo="variavel")
        db.add(categoria)
        db.flush()
    return categoria


def registrar_entrada(
    db: Session, payload: EntradaEstoqueCreate, usuario_id: int
) -> MovimentacaoEstoque:
    peca = _obter_peca_ou_404(db, payload.peca_id)

    custo_unitario = payload.custo_unitario if payload.custo_unitario is not None else peca.custo_compra
    fornecedor_id = payload.fornecedor_id if payload.fornecedor_id is not None else peca.fornecedor_id

    if payload.categoria_id is not None:
        categoria_id = payload.categoria_id
    else:
        categoria_id = _garantir_categoria_pecas_insumos(db).id

    # Regra: entrada gera automaticamente um lançamento em Contas a Pagar.
    conta_pagar = ContaPagar(
        fornecedor_id=fornecedor_id,
        descricao=f"Compra de peça: {peca.descricao} ({peca.codigo})",
        categoria_id=categoria_id,
        centro_custo_id=payload.centro_custo_id,
        valor=payload.quantidade * custo_unitario,
        vencimento=payload.vencimento,
        status="pendente",
        origem="compra_peca",
    )
    db.add(conta_pagar)
    db.flush()  # garante conta_pagar.id

    movimentacao = MovimentacaoEstoque(
        peca_id=peca.id,
        tipo="entrada",
        quantidade=payload.quantidade,
        usuario_id=usuario_id,
        conta_pagar_id=conta_pagar.id,
        observacao=payload.observacao,
    )
    db.add(movimentacao)

    peca.estoque_atual = peca.estoque_atual + payload.quantidade
    # A entrada também atualiza o custo de compra vigente da peça, para que
    # o próximo cálculo de margem use o custo mais recente.
    peca.custo_compra = custo_unitario

    db.commit()
    db.refresh(movimentacao)
    return movimentacao


def registrar_ajuste(
    db: Session, payload: AjusteEstoqueCreate, usuario_id: int
) -> MovimentacaoEstoque:
    peca = _obter_peca_ou_404(db, payload.peca_id)

    novo_estoque = peca.estoque_atual + payload.quantidade
    if novo_estoque < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Ajuste deixaria o estoque negativo "
                f"(atual: {peca.estoque_atual}, ajuste: {payload.quantidade})"
            ),
        )

    movimentacao = MovimentacaoEstoque(
        peca_id=peca.id,
        tipo="ajuste",
        quantidade=payload.quantidade,
        motivo=payload.motivo,
        usuario_id=usuario_id,
        observacao=payload.observacao,
    )
    db.add(movimentacao)

    peca.estoque_atual = novo_estoque

    db.commit()
    db.refresh(movimentacao)
    return movimentacao
