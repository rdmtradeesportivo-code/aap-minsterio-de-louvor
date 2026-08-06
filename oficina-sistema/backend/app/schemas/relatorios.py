from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class OrcadoRealizadoItem(BaseModel):
    categoria_id: int
    categoria_nome: str
    categoria_tipo: str
    valor_meta: Decimal
    valor_realizado: Decimal
    percentual_atingido: Decimal | None  # None quando não há meta definida
    alerta: bool  # >= 90% da meta


class DreOut(BaseModel):
    periodo_inicio: date
    periodo_fim: date  # exclusivo
    receita_total: Decimal
    custo_pecas: Decimal
    comissoes: Decimal
    margem_contribuicao: Decimal
    despesas_fixas: Decimal
    lucro_liquido: Decimal


class FluxoCaixaDia(BaseModel):
    data: date
    entradas_realizadas: Decimal
    entradas_projetadas: Decimal
    saidas_realizadas: Decimal
    saidas_projetadas: Decimal
    saldo_dia: Decimal
    saldo_acumulado: Decimal


class PontoEquilibrioOut(BaseModel):
    periodo_inicio: date
    periodo_fim: date
    receita_total: Decimal
    despesas_fixas: Decimal
    margem_contribuicao: Decimal
    margem_contribuicao_percentual: Decimal | None
    ponto_equilibrio: Decimal | None


class EvolucaoMensalItem(BaseModel):
    mes: date
    receita: Decimal
    despesa: Decimal
    lucro: Decimal


class DespesaPorCategoriaItem(BaseModel):
    categoria_id: int
    categoria_nome: str
    categoria_tipo: str
    valor: Decimal
