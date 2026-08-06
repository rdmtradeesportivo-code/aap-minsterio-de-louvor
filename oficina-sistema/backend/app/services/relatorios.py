"""DRE simplificado, orçado x realizado, fluxo de caixa, ponto de
equilíbrio e evolução mensal — todos consultando dados reais gravados
pelos módulos anteriores (nenhum número mockado):

- Receita e custo de peças vêm de `ordens_servico`/`os_itens_peca`, restrito
  às OS que realmente passaram pela transição para "faturado"
  (`os_status_log`) dentro do período — o mesmo `calcular_valor_total` do
  Módulo 4 é reaproveitado aqui, então a receita do DRE nunca diverge do
  valor mostrado na própria OS. Uma OS cancelada nunca chega a "faturado",
  então fica de fora por construção, sem precisar de nenhum filtro
  adicional.
- Comissões vêm de `comissoes.valor` (já zerado pelo cancelamento, se for
  o caso — ver app/services/ordem_servico.py::cancelar_os).
- Despesas fixas vêm de `contas_pagar` reais (categorias fixa/tributos/
  investimentos, ver nota em `_despesas_fixas`) mais a parte de salário
  base das folhas fechadas no período (a comissão da folha já está contada
  na linha "Comissões" acima, então não entra de novo aqui — ver nota).
- Orçado x realizado consulta `contas_pagar` reais por categoria/mês, nunca
  um número calculado à parte.
"""

from datetime import date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.orm import Session, selectinload

from app.core.datas import primeiro_dia_do_mes, primeiro_dia_do_proximo_mes, subtrair_meses
from app.models.cliente import Cliente
from app.models.financeiro import CategoriaDespesa, Comissao, ContaPagar, ContaReceber, FolhaPagamento, MetaOrcamento
from app.models.ordem_servico import OrdemServico, OsStatusLog
from app.services import financeiro as financeiro_service
from app.services.ordem_servico import calcular_valor_total

LIMITE_DIAS_FLUXO_CAIXA = 366


def _os_faturadas_no_periodo_com_data(db: Session, inicio: date, fim: date) -> list[tuple[OrdemServico, datetime]]:
    """OS que passaram pela transição para 'faturado' dentro de [inicio, fim),
    junto com o instante exato dessa transição. Uma OS cancelada nunca
    aparece aqui, porque cancelamento só é permitido antes dessa transição
    existir (ver app/services/ordem_servico.py::cancelar_os /
    STATUS_ANTES_DE_FATURAR) — é a mesma consulta usada pelo DRE, pelo
    faturamento por período, pelo lucro por OS e pelo ranking de serviços,
    então a exclusão de OS canceladas é garantida uma única vez, aqui,
    para todos os relatórios que dependem de "o que foi vendido"."""
    linhas = (
        db.query(OsStatusLog.os_id, OsStatusLog.data_hora)
        .filter(
            OsStatusLog.status_novo == "faturado",
            OsStatusLog.data_hora >= inicio,
            OsStatusLog.data_hora < fim,
        )
        .all()
    )
    if not linhas:
        return []
    datas_por_os = {os_id: data_hora for os_id, data_hora in linhas}
    ordens = (
        db.query(OrdemServico)
        .options(
            selectinload(OrdemServico.itens_peca),
            selectinload(OrdemServico.itens_servico),
            selectinload(OrdemServico.cliente),
        )
        .filter(OrdemServico.id.in_(datas_por_os.keys()))
        .all()
    )
    return [(os_, datas_por_os[os_.id]) for os_ in ordens]


def _os_faturadas_no_periodo(db: Session, inicio: date, fim: date) -> list[OrdemServico]:
    return [os_ for os_, _ in _os_faturadas_no_periodo_com_data(db, inicio, fim)]


def _despesas_fixas(db: Session, inicio: date, fim: date) -> Decimal:
    """Despesas fixas do período = contas_pagar reais nas categorias
    fixa/tributos/investimentos (por vencimento) + salário-base das folhas
    fechadas no período.

    Nota deliberada: o DRE "simplificado" pedido no briefing só tem uma
    linha "Despesas fixas" (sem quebrar tributos/investimentos à parte) —
    por isso os três tipos entram juntos aqui. A comissão da folha NÃO
    entra nesta soma (só o salario_base) porque ela já foi contada na linha
    "Comissões" do DRE, calculada direto de `comissoes.valor` — somar de
    novo aqui duplicaria o valor.
    """
    despesas_categoria = (
        db.query(ContaPagar.valor)
        .join(CategoriaDespesa, ContaPagar.categoria_id == CategoriaDespesa.id)
        .filter(
            CategoriaDespesa.tipo.in_(["fixa", "tributos", "investimentos"]),
            ContaPagar.vencimento >= inicio,
            ContaPagar.vencimento < fim,
        )
        .all()
    )
    total_categoria = sum((v for (v,) in despesas_categoria), Decimal("0"))

    salarios = (
        db.query(FolhaPagamento.salario_base)
        .filter(
            FolhaPagamento.mes_referencia >= inicio,
            FolhaPagamento.mes_referencia < fim,
            FolhaPagamento.status.in_(["fechado", "pago"]),
        )
        .all()
    )
    total_salarios = sum((v for (v,) in salarios), Decimal("0"))

    return total_categoria + total_salarios


def calcular_dre(db: Session, inicio: date, fim: date) -> dict:
    """`fim` é exclusivo — período é [inicio, fim)."""
    ordens = _os_faturadas_no_periodo(db, inicio, fim)
    os_ids = [os_.id for os_ in ordens]

    duas_casas = Decimal("0.01")

    receita_total = sum((calcular_valor_total(os_) for os_ in ordens), Decimal("0"))
    custo_pecas = sum(
        (
            item.quantidade * item.custo_unitario
            for os_ in ordens
            for item in os_.itens_peca
        ),
        Decimal("0"),
    ).quantize(duas_casas, rounding=ROUND_HALF_UP)

    comissoes_total = Decimal("0")
    if os_ids:
        linhas = db.query(Comissao.valor).filter(Comissao.os_id.in_(os_ids)).all()
        comissoes_total = sum((v for (v,) in linhas), Decimal("0"))

    margem_contribuicao = (receita_total - custo_pecas - comissoes_total).quantize(
        duas_casas, rounding=ROUND_HALF_UP
    )
    despesas_fixas = _despesas_fixas(db, inicio, fim)
    lucro_liquido = (margem_contribuicao - despesas_fixas).quantize(duas_casas, rounding=ROUND_HALF_UP)

    return {
        "periodo_inicio": inicio,
        "periodo_fim": fim,
        "receita_total": receita_total,
        "custo_pecas": custo_pecas,
        "comissoes": comissoes_total,
        "margem_contribuicao": margem_contribuicao,
        "despesas_fixas": despesas_fixas,
        "lucro_liquido": lucro_liquido,
    }


def calcular_dre_mes(db: Session, mes_referencia: date) -> dict:
    inicio = primeiro_dia_do_mes(mes_referencia)
    fim = primeiro_dia_do_proximo_mes(inicio)
    return calcular_dre(db, inicio, fim)


def calcular_ponto_equilibrio(db: Session, mes_referencia: date) -> dict:
    dre = calcular_dre_mes(db, mes_referencia)
    receita_total = dre["receita_total"]
    margem_contribuicao = dre["margem_contribuicao"]
    despesas_fixas = dre["despesas_fixas"]

    margem_percentual = None
    ponto_equilibrio = None
    if receita_total > 0:
        margem_percentual = (margem_contribuicao / receita_total * 100).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        if margem_percentual > 0:
            ponto_equilibrio = (despesas_fixas / (margem_percentual / 100)).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )

    return {
        "periodo_inicio": dre["periodo_inicio"],
        "periodo_fim": dre["periodo_fim"],
        "receita_total": receita_total,
        "despesas_fixas": despesas_fixas,
        "margem_contribuicao": margem_contribuicao,
        "margem_contribuicao_percentual": margem_percentual,
        "ponto_equilibrio": ponto_equilibrio,
    }


def evolucao_mensal(db: Session, meses: int) -> list[dict]:
    """Últimos `meses` (incluindo o mês atual), receita x despesa x lucro,
    cada mês recalculado com o mesmo `calcular_dre` — despesa aqui é
    despesas_fixas + custo_pecas + comissoes (todo o custo do período)."""
    hoje = date.today()
    mes_atual = primeiro_dia_do_mes(hoje)
    resultado = []
    for i in range(meses - 1, -1, -1):
        mes = subtrair_meses(mes_atual, i) if i > 0 else mes_atual
        dre = calcular_dre_mes(db, mes)
        despesa_total = dre["custo_pecas"] + dre["comissoes"] + dre["despesas_fixas"]
        resultado.append(
            {
                "mes": mes,
                "receita": dre["receita_total"],
                "despesa": despesa_total,
                "lucro": dre["lucro_liquido"],
            }
        )
    return resultado


def orcado_realizado(db: Session, mes_referencia: date) -> list[dict]:
    mes = primeiro_dia_do_mes(mes_referencia)
    proximo_mes = primeiro_dia_do_proximo_mes(mes)

    categorias = db.query(CategoriaDespesa).order_by(CategoriaDespesa.nome).all()
    metas = db.query(MetaOrcamento).filter(MetaOrcamento.mes_referencia == mes).all()
    metas_por_categoria = {m.categoria_id: m.valor_meta for m in metas}

    realizado_rows = (
        db.query(ContaPagar.categoria_id, ContaPagar.valor)
        .filter(ContaPagar.vencimento >= mes, ContaPagar.vencimento < proximo_mes)
        .all()
    )
    realizado_por_categoria: dict[int, Decimal] = {}
    for categoria_id, valor in realizado_rows:
        realizado_por_categoria[categoria_id] = realizado_por_categoria.get(categoria_id, Decimal("0")) + valor

    itens = []
    for categoria in categorias:
        meta = metas_por_categoria.get(categoria.id, Decimal("0"))
        realizado = realizado_por_categoria.get(categoria.id, Decimal("0"))
        percentual = None
        alerta = False
        if meta > 0:
            percentual = (realizado / meta * 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            alerta = percentual >= 90
        itens.append(
            {
                "categoria_id": categoria.id,
                "categoria_nome": categoria.nome,
                "categoria_tipo": categoria.tipo,
                "valor_meta": meta,
                "valor_realizado": realizado,
                "percentual_atingido": percentual,
                "alerta": alerta,
            }
        )
    return itens


def despesas_por_categoria(db: Session, mes_referencia: date) -> list[dict]:
    mes = primeiro_dia_do_mes(mes_referencia)
    proximo_mes = primeiro_dia_do_proximo_mes(mes)

    rows = (
        db.query(CategoriaDespesa, ContaPagar.valor)
        .join(ContaPagar, ContaPagar.categoria_id == CategoriaDespesa.id)
        .filter(ContaPagar.vencimento >= mes, ContaPagar.vencimento < proximo_mes)
        .all()
    )
    por_categoria: dict[int, dict] = {}
    for categoria, valor in rows:
        item = por_categoria.setdefault(
            categoria.id,
            {"categoria_id": categoria.id, "categoria_nome": categoria.nome, "categoria_tipo": categoria.tipo, "valor": Decimal("0")},
        )
        item["valor"] += valor
    return sorted(por_categoria.values(), key=lambda i: i["valor"], reverse=True)


def fluxo_caixa(db: Session, inicio: date, fim: date) -> list[dict]:
    if (fim - inicio).days > LIMITE_DIAS_FLUXO_CAIXA:
        raise ValueError(f"Período máximo de {LIMITE_DIAS_FLUXO_CAIXA} dias")

    def agrupar_por_dia(rows) -> dict[date, Decimal]:
        agrupado: dict[date, Decimal] = {}
        for d, valor in rows:
            if d is None:
                continue
            agrupado[d] = agrupado.get(d, Decimal("0")) + valor
        return agrupado

    entradas_realizadas = agrupar_por_dia(
        db.query(ContaReceber.data_recebimento, ContaReceber.valor)
        .filter(ContaReceber.status == "recebido", ContaReceber.data_recebimento >= inicio, ContaReceber.data_recebimento <= fim)
        .all()
    )
    entradas_projetadas = agrupar_por_dia(
        db.query(ContaReceber.vencimento, ContaReceber.valor)
        .filter(ContaReceber.status.in_(["pendente", "atrasado"]), ContaReceber.vencimento >= inicio, ContaReceber.vencimento <= fim)
        .all()
    )
    saidas_realizadas = agrupar_por_dia(
        db.query(ContaPagar.data_pagamento, ContaPagar.valor)
        .filter(ContaPagar.status == "pago", ContaPagar.data_pagamento >= inicio, ContaPagar.data_pagamento <= fim)
        .all()
    )
    saidas_projetadas = agrupar_por_dia(
        db.query(ContaPagar.vencimento, ContaPagar.valor)
        .filter(ContaPagar.status.in_(["pendente", "atrasado"]), ContaPagar.vencimento >= inicio, ContaPagar.vencimento <= fim)
        .all()
    )

    dias = []
    saldo_acumulado = Decimal("0")
    d = inicio
    while d <= fim:
        e_r = entradas_realizadas.get(d, Decimal("0"))
        e_p = entradas_projetadas.get(d, Decimal("0"))
        s_r = saidas_realizadas.get(d, Decimal("0"))
        s_p = saidas_projetadas.get(d, Decimal("0"))
        saldo_dia = (e_r + e_p) - (s_r + s_p)
        saldo_acumulado += saldo_dia
        dias.append(
            {
                "data": d,
                "entradas_realizadas": e_r,
                "entradas_projetadas": e_p,
                "saidas_realizadas": s_r,
                "saidas_projetadas": s_p,
                "saldo_dia": saldo_dia,
                "saldo_acumulado": saldo_acumulado,
            }
        )
        d += timedelta(days=1)
    return dias


# ---------------------------------------------------------------------- #
# Módulo 6 — Relatórios Gerais
# ---------------------------------------------------------------------- #
def faturamento_por_periodo(db: Session, inicio: date, fim: date) -> dict:
    ordens = _os_faturadas_no_periodo(db, inicio, fim)
    valor_total = sum((calcular_valor_total(os_) for os_ in ordens), Decimal("0"))
    return {
        "periodo_inicio": inicio,
        "periodo_fim": fim,
        "quantidade_os": len(ordens),
        "valor_total": valor_total,
    }


def lucro_por_os(db: Session, inicio: date, fim: date) -> list[dict]:
    """Lucro de cada OS faturada no período. O custo de peças usa sempre
    `os_itens_peca.custo_unitario` — o SNAPSHOT do custo no momento em que
    a peça foi baixada na OS — nunca `peca.custo_compra` (o custo atual da
    peça, que pode já ter mudado desde então). Usar o custo atual faria o
    lucro histórico de uma OS antiga mudar toda vez que o preço de compra
    da peça mudasse, o que não faz sentido nenhum contabilmente.
    """
    duas_casas = Decimal("0.01")
    resultado = []
    for os_, data_faturamento in _os_faturadas_no_periodo_com_data(db, inicio, fim):
        receita = calcular_valor_total(os_)
        custo_pecas = sum(
            (item.quantidade * item.custo_unitario for item in os_.itens_peca), Decimal("0")
        ).quantize(duas_casas, rounding=ROUND_HALF_UP)
        comissoes_os = sum(
            (c.valor for c in db.query(Comissao).filter(Comissao.os_id == os_.id).all()), Decimal("0")
        )
        lucro = (receita - custo_pecas - comissoes_os).quantize(duas_casas, rounding=ROUND_HALF_UP)
        margem = (lucro / receita * 100).quantize(duas_casas, rounding=ROUND_HALF_UP) if receita > 0 else None

        resultado.append(
            {
                "os_id": os_.id,
                "numero": os_.numero,
                "cliente_nome": os_.cliente.nome,
                "data_faturamento": data_faturamento,
                "receita": receita,
                "custo_pecas": custo_pecas,
                "comissoes": comissoes_os,
                "lucro": lucro,
                "margem_percentual": margem,
            }
        )

    resultado.sort(key=lambda r: r["data_faturamento"], reverse=True)
    return resultado


def inadimplencia_clientes(db: Session) -> list[dict]:
    """Contas a receber em atraso, agrupadas por cliente. `contas_receber`
    só é criada por `faturar_os` (Módulo 4), e uma OS cancelada nunca chega
    a `faturado` — então nunca existe `contas_receber` de uma OS cancelada,
    e este relatório exclui OS canceladas por construção, sem precisar de
    nenhum filtro adicional aqui.
    """
    financeiro_service.atualizar_status_vencidos(db)

    contas_atrasadas = db.query(ContaReceber).filter(ContaReceber.status == "atrasado").all()

    por_cliente: dict[int, dict] = {}
    for conta in contas_atrasadas:
        item = por_cliente.setdefault(
            conta.cliente_id,
            {
                "cliente_id": conta.cliente_id,
                "quantidade_contas": 0,
                "valor_total_atrasado": Decimal("0"),
                "conta_mais_antiga_vencimento": None,
            },
        )
        item["quantidade_contas"] += 1
        item["valor_total_atrasado"] += conta.valor
        if item["conta_mais_antiga_vencimento"] is None or conta.vencimento < item["conta_mais_antiga_vencimento"]:
            item["conta_mais_antiga_vencimento"] = conta.vencimento

    if not por_cliente:
        return []

    nomes = {c.id: c.nome for c in db.query(Cliente).filter(Cliente.id.in_(por_cliente.keys())).all()}
    resultado = []
    for cliente_id, item in por_cliente.items():
        item["cliente_nome"] = nomes.get(cliente_id, f"Cliente #{cliente_id}")
        resultado.append(item)

    resultado.sort(key=lambda r: r["valor_total_atrasado"], reverse=True)
    return resultado


def ranking_servicos(db: Session, inicio: date, fim: date) -> list[dict]:
    """Ranking de serviços mais vendidos, por valor faturado no período.
    Só considera `os_itens_servico` de OS que passaram pela transição para
    `faturado` — uma OS cancelada mantém seus itens visíveis (para
    auditoria, ver `cancelar_os`), mas como ela nunca é faturada, seus
    itens nunca entram nesta contagem.
    """
    contagem: dict[str, dict] = {}
    for os_ in _os_faturadas_no_periodo(db, inicio, fim):
        for item in os_.itens_servico:
            chave = item.descricao.strip().lower()
            entrada = contagem.setdefault(chave, {"descricao": item.descricao, "quantidade": 0, "valor_total": Decimal("0")})
            entrada["quantidade"] += 1
            entrada["valor_total"] += item.valor

    resultado = list(contagem.values())
    resultado.sort(key=lambda r: r["valor_total"], reverse=True)
    return resultado
