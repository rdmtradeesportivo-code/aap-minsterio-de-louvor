"""Seed de dados de teste — Módulo 6 (Relatórios Gerais).

O seed do Módulo 4 (`seed_ordens_servico`) já deixa uma OS faturada no
sistema, o que é suficiente para os relatórios funcionarem — mas insuficiente
para *demonstrar* alguns deles de forma visível:

- "Ranking de serviços" com apenas 1 OS faturada mostra sempre 1 linha.
- "Inadimplência de clientes" fica sempre vazia, porque a única conta a
  receber existente vence 30 dias no futuro (nunca atrasada).
- A exclusão de OS canceladas dos relatórios (já provada via API/psql) fica
  invisível no frontend se não houver nenhuma OS cancelada com itens.

Este seed usa os serviços reais (`app.services.ordem_servico`) para criar:

1. Uma segunda OS faturada (Maria Oliveira / Farol dianteiro HB20 + troca de
   farol), com um serviço de descrição diferente da primeira — para o
   ranking mostrar duas linhas distintas.
2. Uma terceira OS faturada (Transportadora Rápida), cuja conta a receber
   tem o vencimento manualmente retroagido para o passado — simulando uma
   fatura vencida e não paga, para popular "Inadimplência de clientes".
3. Uma quarta OS que chega a ter item de serviço lançado e depois é
   cancelada antes de faturar — para o frontend mostrar, lado a lado, que
   ela aparece na lista de OS mas não no ranking nem no faturamento.

Uso:
    python -m app.seeds.seed_relatorios
"""

from datetime import date, timedelta
from decimal import Decimal

from app.core.database import SessionLocal
from app.models.cliente import Cliente
from app.models.estoque import Peca
from app.models.financeiro import ContaReceber, Funcionario
from app.models.ordem_servico import OrdemServico
from app.models.usuario import Usuario
from app.models.veiculo import Veiculo
from app.schemas.ordem_servico import (
    CancelarRequest,
    FaturarRequest,
    ItemPecaCreate,
    ItemServicoCreate,
    OrdemServicoCreate,
)
from app.services import financeiro as financeiro_service
from app.services import ordem_servico as os_service


def _criar_os_faturada(db, *, cliente, veiculo, peca, descricao_servico, valor_servico, admin_id, funcionario_id):
    os_ = os_service.criar_os(
        db,
        OrdemServicoCreate(cliente_id=cliente.id, veiculo_id=veiculo.id, forma_pagamento="pix"),
        usuario_id=admin_id,
    )
    print(f"+ OS #{os_.numero} criada (orçamento) para {cliente.nome} / {veiculo.placa}")

    os_service.adicionar_item_peca(
        db, os_.id, ItemPecaCreate(peca_id=peca.id, quantidade=Decimal("1")), usuario_id=admin_id
    )
    print(f"  item de peça adicionado: {peca.descricao} x1")

    os_service.adicionar_item_servico(
        db,
        os_.id,
        ItemServicoCreate(descricao=descricao_servico, valor=valor_servico, funcionario_id=funcionario_id),
    )
    print(f"  item de serviço adicionado: {descricao_servico} (R$ {valor_servico})")

    for status_novo in ("aprovado", "em_execucao", "concluido"):
        os_service.mudar_status(db, os_.id, status_novo, usuario_id=admin_id)

    os_ = os_service.faturar_os(db, os_.id, FaturarRequest(numero_parcelas=1), usuario_id=admin_id)
    print(f"  status -> faturado (R$ {os_service.calcular_valor_total(os_)})")
    return os_


def run() -> None:
    db = SessionLocal()
    try:
        admin = db.query(Usuario).filter(Usuario.email == "admin@oficina.com").first()
        if admin is None:
            print("! usuário admin@oficina.com não encontrado — rode o seed_usuarios primeiro.")
            return

        roberto = db.query(Funcionario).filter(Funcionario.nome == "Roberto Pintor").first()
        if roberto is None:
            print("! funcionário 'Roberto Pintor' não encontrado — rode o seed_ordens_servico primeiro.")
            return

        marca_seed = (
            db.query(OrdemServico)
            .join(Cliente, Cliente.id == OrdemServico.cliente_id)
            .filter(Cliente.nome == "Transportadora Rápida Ltda")
            .first()
        )
        if marca_seed:
            print("- seed do Módulo 6 já foi aplicado (OS para Transportadora Rápida existe) — não duplica.")
            return

        maria = db.query(Cliente).filter(Cliente.nome == "Maria Oliveira").first()
        transportadora = db.query(Cliente).filter(Cliente.nome == "Transportadora Rápida Ltda").first()
        if maria is None or transportadora is None:
            print("! clientes de seed não encontrados — rode o seed_clientes primeiro.")
            return

        veiculo_maria = db.query(Veiculo).filter(Veiculo.cliente_id == maria.id).first()
        veiculo_transportadora = db.query(Veiculo).filter(Veiculo.cliente_id == transportadora.id).first()

        farol = db.query(Peca).filter(Peca.codigo == "FAROL-D-HB20").first()
        tinta = db.query(Peca).filter(Peca.codigo == "TINTA-PRATA-001").first()
        if farol is None or tinta is None:
            print("! peças de seed não encontradas — rode o seed_estoque primeiro.")
            return

        # 1) Segunda OS faturada — ranking de serviços passa a ter 2 linhas.
        _criar_os_faturada(
            db,
            cliente=maria,
            veiculo=veiculo_maria,
            peca=farol,
            descricao_servico="Troca de farol dianteiro",
            valor_servico=Decimal("120.00"),
            admin_id=admin.id,
            funcionario_id=roberto.id,
        )

        # 2) Terceira OS faturada — sua conta a receber será retroagida para
        #    ficar vencida, populando "Inadimplência de clientes".
        os_atrasada = _criar_os_faturada(
            db,
            cliente=transportadora,
            veiculo=veiculo_transportadora,
            peca=tinta,
            descricao_servico="Pintura de retoque na lateral",
            valor_servico=Decimal("300.00"),
            admin_id=admin.id,
            funcionario_id=roberto.id,
        )
        conta = db.query(ContaReceber).filter(ContaReceber.os_id == os_atrasada.id).first()
        conta.vencimento = date.today() - timedelta(days=15)
        db.commit()
        print(f"  conta a receber #{conta.id} retroagida para {conta.vencimento} (simula inadimplência)")

        # 3) Quarta OS: recebe item de serviço e é cancelada antes de faturar
        #    — deve aparecer na lista de OS, mas nunca no ranking/faturamento.
        os_cancelada = os_service.criar_os(
            db,
            OrdemServicoCreate(cliente_id=maria.id, veiculo_id=veiculo_maria.id, forma_pagamento="pix"),
            usuario_id=admin.id,
        )
        os_service.adicionar_item_servico(
            db,
            os_cancelada.id,
            ItemServicoCreate(descricao="Orçamento de funilaria recusado pelo cliente", valor=Decimal("500.00")),
        )
        os_service.cancelar_os(
            db,
            os_cancelada.id,
            CancelarRequest(motivo="Cliente não aprovou o orçamento"),
            usuario_id=admin.id,
        )
        print(
            f"+ OS #{os_cancelada.numero} criada e cancelada (item de serviço nunca entra no ranking/faturamento)"
        )

        # Recalcula status vencidos, para a conta retroagida já nascer como
        # "atrasado" ao invés de depender da próxima chamada de relatório.
        financeiro_service.atualizar_status_vencidos(db)
        db.commit()
    finally:
        db.close()

    print()
    print("Seed de relatórios (Módulo 6) concluído.")


if __name__ == "__main__":
    run()
