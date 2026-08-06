"""Seed de dados de teste — Módulo 4 (Ordens de Serviço).

Usa os serviços reais (`app.services.ordem_servico`) para criar uma OS de
ponta a ponta — orçamento → aprovado → em_execução → concluído → faturado —
exercitando baixa de estoque, cálculo de comissão e geração de contas a
receber, exatamente como a API faz.

Uso:
    python -m app.seeds.seed_ordens_servico
"""

from decimal import Decimal

from app.core.database import SessionLocal
from app.models.cliente import Cliente
from app.models.estoque import Peca
from app.models.financeiro import Funcionario, RegraComissao
from app.models.ordem_servico import OrdemServico
from app.models.usuario import Usuario
from app.models.veiculo import Veiculo
from app.schemas.ordem_servico import (
    FaturarRequest,
    ItemPecaCreate,
    ItemServicoCreate,
    OrdemServicoCreate,
    OsFuncionarioCreate,
)
from app.services import ordem_servico as os_service

FUNCIONARIOS_SEED = [
    {
        "nome": "Carlos Mecânico",
        "cargo": "Mecânico/Funileiro",
        "salario_base": Decimal("2200.00"),
        "percentual_comissao_padrao": Decimal("8.00"),
        "usuario_email": "mecanico@oficina.com",  # vincula ao usuário de login
    },
    {
        "nome": "Roberto Pintor",
        "cargo": "Pintor",
        "salario_base": Decimal("2000.00"),
        "percentual_comissao_padrao": Decimal("10.00"),
        "usuario_email": None,  # funcionário sem login no sistema
    },
]


def run() -> None:
    db = SessionLocal()
    try:
        admin = db.query(Usuario).filter(Usuario.email == "admin@oficina.com").first()
        if admin is None:
            print("! usuário admin@oficina.com não encontrado — rode o seed_usuarios primeiro.")
            return

        funcionarios = {}
        for dados in FUNCIONARIOS_SEED:
            existente = db.query(Funcionario).filter(Funcionario.nome == dados["nome"]).first()
            if existente:
                print(f"- funcionário já existe: {dados['nome']}")
                funcionarios[dados["nome"]] = existente
                continue

            usuario_id = None
            if dados["usuario_email"]:
                usuario = db.query(Usuario).filter(Usuario.email == dados["usuario_email"]).first()
                usuario_id = usuario.id if usuario else None

            funcionario = Funcionario(
                nome=dados["nome"],
                cargo=dados["cargo"],
                salario_base=dados["salario_base"],
                percentual_comissao_padrao=dados["percentual_comissao_padrao"],
                usuario_id=usuario_id,
            )
            db.add(funcionario)
            db.flush()
            funcionarios[dados["nome"]] = funcionario
            print(f"+ funcionário criado: {dados['nome']} (comissão padrão {dados['percentual_comissao_padrao']}%)")

        # Regra de comissão específica para o Carlos, um pouco acima do padrão
        # dele — só para mostrar que a regra específica tem prioridade.
        carlos = funcionarios["Carlos Mecânico"]
        if not db.query(RegraComissao).filter(RegraComissao.funcionario_id == carlos.id).first():
            db.add(RegraComissao(funcionario_id=carlos.id, categoria_peca_id=None, percentual=Decimal("12.00")))
            print("+ regra de comissão criada: Carlos Mecânico -> 12%")

        db.commit()

        cliente = db.query(Cliente).filter(Cliente.nome == "João da Silva").first()
        if cliente is None:
            print("! cliente 'João da Silva' não encontrado — rode o seed_clientes primeiro.")
            return
        veiculo = db.query(Veiculo).filter(Veiculo.cliente_id == cliente.id).first()
        if veiculo is None:
            print("! nenhum veículo encontrado para João da Silva.")
            return

        peca = db.query(Peca).filter(Peca.codigo == "PARLAT-001").first()
        if peca is None:
            print("! peça 'PARLAT-001' não encontrada — rode o seed_estoque primeiro.")
            return

        os_existente = (
            db.query(OrdemServico).filter(OrdemServico.veiculo_id == veiculo.id).first()
        )
        if os_existente:
            print(f"- OS já existe para este veículo (#{os_existente.numero}) — seed não duplica.")
            return

        os_ = os_service.criar_os(
            db,
            OrdemServicoCreate(cliente_id=cliente.id, veiculo_id=veiculo.id, forma_pagamento="cartao"),
            usuario_id=admin.id,
        )
        print(f"+ OS #{os_.numero} criada (orçamento) para {cliente.nome} / {veiculo.placa}")

        os_service.adicionar_item_peca(
            db, os_.id, ItemPecaCreate(peca_id=peca.id, quantidade=Decimal("1")), usuario_id=admin.id
        )
        print(f"  item de peça adicionado: {peca.descricao} x1 (baixa de estoque aplicada)")

        os_service.adicionar_item_servico(
            db,
            os_.id,
            ItemServicoCreate(
                descricao="Reparo e pintura do para-choque",
                valor=Decimal("400.00"),
                funcionario_id=carlos.id,
            ),
        )
        print("  item de serviço adicionado: Reparo e pintura (R$ 400,00, Carlos Mecânico)")

        os_service.adicionar_funcionario(
            db, os_.id, OsFuncionarioCreate(funcionario_id=carlos.id, papel="funileiro")
        )

        for status_novo in ("aprovado", "em_execucao", "concluido"):
            os_service.mudar_status(db, os_.id, status_novo, usuario_id=admin.id)
            print(f"  status -> {status_novo}")

        os_ = os_service.faturar_os(db, os_.id, FaturarRequest(numero_parcelas=1), usuario_id=admin.id)
        print(f"  status -> faturado (conta a receber gerada)")

        valor_total = os_service.calcular_valor_total(os_)
        print(f"  valor_total calculado dinamicamente: R$ {valor_total}")
    finally:
        db.close()

    print()
    print("Seed de ordens de serviço concluído.")


if __name__ == "__main__":
    run()
