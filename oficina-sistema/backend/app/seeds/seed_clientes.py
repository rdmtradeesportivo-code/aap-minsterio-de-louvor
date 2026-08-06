"""Seed de dados de teste — Módulo 2 (Clientes e Veículos).

Uso:
    python -m app.seeds.seed_clientes
"""

from app.core.database import SessionLocal
from app.models.cliente import Cliente
from app.models.veiculo import Veiculo

CLIENTES_SEED = [
    {
        "nome": "João da Silva",
        "telefone": "(11) 98888-1111",
        "email": "joao.silva@example.com",
        "cpf_cnpj": "111.111.111-11",
        "endereco": "Rua das Flores, 100 - São Paulo/SP",
        "veiculos": [
            {"placa": "ABC1D23", "modelo": "Onix", "marca": "Chevrolet", "ano": 2020, "cor": "Prata", "km_atual": 45000},
        ],
    },
    {
        "nome": "Maria Oliveira",
        "telefone": "(11) 97777-2222",
        "email": "maria.oliveira@example.com",
        "cpf_cnpj": "222.222.222-22",
        "endereco": "Av. Central, 500 - São Paulo/SP",
        "veiculos": [
            {"placa": "DEF4E56", "modelo": "HB20", "marca": "Hyundai", "ano": 2019, "cor": "Branco", "km_atual": 62000},
            {"placa": "GHI7F89", "modelo": "Strada", "marca": "Fiat", "ano": 2022, "cor": "Vermelho", "km_atual": 15000},
        ],
    },
    {
        "nome": "Transportadora Rápida Ltda",
        "telefone": "(11) 3333-4444",
        "email": "contato@transportadorarapida.com",
        "cpf_cnpj": "12.345.678/0001-99",
        "endereco": "Rod. dos Transportes, km 12 - Guarulhos/SP",
        "veiculos": [
            {"placa": "JKL0G12", "modelo": "Sprinter", "marca": "Mercedes-Benz", "ano": 2018, "cor": "Branco", "km_atual": 180000},
        ],
    },
]


def run() -> None:
    db = SessionLocal()
    try:
        for dados in CLIENTES_SEED:
            existente = db.query(Cliente).filter(Cliente.cpf_cnpj == dados["cpf_cnpj"]).first()
            if existente:
                print(f"- já existe: {dados['nome']} ({dados['cpf_cnpj']})")
                continue

            veiculos_dados = dados.pop("veiculos")
            cliente = Cliente(**dados)
            db.add(cliente)
            db.flush()  # garante cliente.id antes de criar os veículos

            for v in veiculos_dados:
                db.add(Veiculo(cliente_id=cliente.id, **v))

            print(f"+ criado: {cliente.nome} com {len(veiculos_dados)} veículo(s)")

        db.commit()
    finally:
        db.close()

    print()
    print("Seed de clientes/veículos concluído.")


if __name__ == "__main__":
    run()
