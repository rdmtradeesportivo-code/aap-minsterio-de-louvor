"""Seed de dados de teste — Módulo 5 (Financeiro completo).

Usa os serviços reais (`app.services.folha`, `app.services.financeiro`,
`app.services.relatorios`) para deixar o financeiro num estado
representativo: uma despesa fixa manual, metas de orçamento, e o
fechamento de folha de dois funcionários — um deles (Carlos Mecânico)
reaproveitando a comissão real gerada pelo seed do Módulo 4 (OS #1), para
provar que o DRE e os dashboards batem com dados de verdade, não mockados.

Uso:
    python -m app.seeds.seed_financeiro
"""

from datetime import date
from decimal import Decimal

from app.core.database import SessionLocal
from app.models.financeiro import CategoriaDespesa, Funcionario, MetaOrcamento
from app.schemas.financeiro import (
    ContaPagarCreate,
    FolhaDescontoCreate,
    FolhaPagamentoCreate,
)
from app.services import financeiro as financeiro_service
from app.services import folha as folha_service
from app.services import relatorios as relatorios_service

MES_ATUAL = date.today().replace(day=1)


def run() -> None:
    db = SessionLocal()
    try:
        # --- categoria fixa + conta a pagar manual ------------------------
        aluguel = db.query(CategoriaDespesa).filter(CategoriaDespesa.nome == "Aluguel").first()
        if aluguel is None:
            aluguel = CategoriaDespesa(nome="Aluguel", tipo="fixa")
            db.add(aluguel)
            db.commit()
            db.refresh(aluguel)
            print("+ categoria de despesa criada: Aluguel (fixa)")

        ja_tem_aluguel = (
            db.query(financeiro_service.ContaPagar)
            .filter(financeiro_service.ContaPagar.descricao == "Aluguel do galpão")
            .first()
        )
        if ja_tem_aluguel is None:
            financeiro_service.criar_conta_pagar(
                db,
                ContaPagarCreate(
                    descricao="Aluguel do galpão",
                    categoria_id=aluguel.id,
                    valor=Decimal("1500.00"),
                    vencimento=date.today(),
                ),
            )
            print("+ conta a pagar criada: Aluguel do galpão (R$ 1.500,00)")
        else:
            print("- conta a pagar já existe: Aluguel do galpão")

        # --- metas de orçamento do mês atual -------------------------------
        pecas_insumos = (
            db.query(CategoriaDespesa).filter(CategoriaDespesa.nome == "Peças e Insumos").first()
        )
        metas = [(aluguel, Decimal("1500.00"))]
        if pecas_insumos:
            metas.append((pecas_insumos, Decimal("1000.00")))

        for categoria, valor_meta in metas:
            existente = (
                db.query(MetaOrcamento)
                .filter(MetaOrcamento.categoria_id == categoria.id, MetaOrcamento.mes_referencia == MES_ATUAL)
                .first()
            )
            if existente is None:
                db.add(MetaOrcamento(categoria_id=categoria.id, mes_referencia=MES_ATUAL, valor_meta=valor_meta))
                db.commit()
                print(f"+ meta de orçamento criada: {categoria.nome} — R$ {valor_meta} ({MES_ATUAL:%m/%Y})")
            else:
                print(f"- meta já existe: {categoria.nome} ({MES_ATUAL:%m/%Y})")

        # --- fechamento de folha ------------------------------------------
        for nome_funcionario, com_desconto in [("Carlos Mecânico", True), ("Roberto Pintor", False)]:
            funcionario = db.query(Funcionario).filter(Funcionario.nome == nome_funcionario).first()
            if funcionario is None:
                print(f"! funcionário '{nome_funcionario}' não encontrado — rode o seed_ordens_servico primeiro.")
                continue

            folha = (
                db.query(folha_service.FolhaPagamento)
                .filter(
                    folha_service.FolhaPagamento.funcionario_id == funcionario.id,
                    folha_service.FolhaPagamento.mes_referencia == MES_ATUAL,
                )
                .first()
            )
            if folha is not None:
                print(f"- folha já existe para {nome_funcionario} ({MES_ATUAL:%m/%Y}), status={folha.status}")
                continue

            folha = folha_service.abrir_folha(
                db, FolhaPagamentoCreate(funcionario_id=funcionario.id, mes_referencia=MES_ATUAL)
            )
            print(f"+ folha aberta: {nome_funcionario} ({MES_ATUAL:%m/%Y})")

            if com_desconto:
                folha_service.adicionar_desconto(
                    db, folha.id, FolhaDescontoCreate(descricao="Vale-transporte", valor=Decimal("100.00"))
                )
                print("  desconto adicionado: Vale-transporte (R$ 100,00)")

            folha = folha_service.fechar_folha(db, folha.id)
            print(
                f"  folha fechada: salário base R$ {folha.salario_base} + comissões R$ {folha.total_comissoes} "
                f"- descontos R$ {folha.total_descontos} = líquido R$ {folha.valor_liquido} "
                f"(conta_pagar #{folha.conta_pagar_id})"
            )
    finally:
        db.close()

    print()
    print("Seed financeiro concluído.")
    _resumo()


def _resumo() -> None:
    """Mostra o DRE e o orçado x realizado do mês, para conferência visual
    de que tudo veio de dados reais."""
    db = SessionLocal()
    try:
        dre = relatorios_service.calcular_dre_mes(db, MES_ATUAL)
        print()
        print(f"DRE de {MES_ATUAL:%m/%Y} (dados reais):")
        print(f"  Receita total (OS faturadas):  R$ {dre['receita_total']}")
        print(f"  (-) Custo de peças/insumos:    R$ {dre['custo_pecas']}")
        print(f"  (-) Comissões:                 R$ {dre['comissoes']}")
        print(f"  = Margem de contribuição:      R$ {dre['margem_contribuicao']}")
        print(f"  (-) Despesas fixas:            R$ {dre['despesas_fixas']}")
        print(f"  = Lucro líquido:               R$ {dre['lucro_liquido']}")

        pe = relatorios_service.calcular_ponto_equilibrio(db, MES_ATUAL)
        print()
        print(f"Ponto de equilíbrio: R$ {pe['ponto_equilibrio']}")

        print()
        print("Orçado x Realizado:")
        for item in relatorios_service.orcado_realizado(db, MES_ATUAL):
            alerta = " ⚠ ALERTA" if item["alerta"] else ""
            print(
                f"  {item['categoria_nome']:20s} meta R$ {item['valor_meta']:>10} "
                f"realizado R$ {item['valor_realizado']:>10} "
                f"({item['percentual_atingido']}%){alerta}"
            )
    finally:
        db.close()


if __name__ == "__main__":
    run()
