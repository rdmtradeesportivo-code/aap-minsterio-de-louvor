"""Seed de dados de teste — Módulo 3 (Estoque de Peças).

Usa os mesmos serviços (`app.services.estoque`) que a API usa para
registrar entrada/ajuste, para que o seed exercite o caminho real: estoque
inicial nunca é atribuído diretamente, sempre por movimentação. Uma das
peças fica deliberadamente abaixo do estoque mínimo para dar para ver o
alerta de estoque baixo funcionando.

Uso:
    python -m app.seeds.seed_estoque
"""

from datetime import date, timedelta
from decimal import Decimal

from app.core.database import SessionLocal
from app.models.estoque import CategoriaPeca, Fornecedor, Peca
from app.models.usuario import Usuario
from app.schemas.estoque import AjusteEstoqueCreate, EntradaEstoqueCreate
from app.services import estoque as estoque_service

FORNECEDORES_SEED = ["Auto Peças Silva", "Distribuidora ABC Tintas"]
CATEGORIAS_SEED = ["Funilaria", "Pintura", "Elétrica", "Mecânica"]

PECAS_SEED = [
    {
        "codigo": "PARLAT-001",
        "descricao": "Para-choque dianteiro Onix",
        "categoria": "Funilaria",
        "fornecedor": "Auto Peças Silva",
        "unidade_medida": "UN",
        "custo_compra": Decimal("350.00"),
        "preco_venda": Decimal("550.00"),
        "estoque_minimo": Decimal("2"),
        # entrada real (gera conta a pagar) — demonstra o fluxo de compra
        "entrada_inicial": Decimal("5"),
    },
    {
        "codigo": "TINTA-PRATA-001",
        "descricao": "Tinta automotiva prata metálico 1L",
        "categoria": "Pintura",
        "fornecedor": "Distribuidora ABC Tintas",
        "unidade_medida": "L",
        "custo_compra": Decimal("80.00"),
        "preco_venda": Decimal("150.00"),
        "estoque_minimo": Decimal("10"),
        # abaixo do mínimo de propósito, para ver o alerta de estoque baixo
        "ajuste_inicial": Decimal("3"),
    },
    {
        "codigo": "LIXA-220-001",
        "descricao": "Lixa d'água grão 220",
        "categoria": "Pintura",
        "fornecedor": "Distribuidora ABC Tintas",
        "unidade_medida": "UN",
        "custo_compra": Decimal("2.50"),
        "preco_venda": Decimal("5.00"),
        "estoque_minimo": Decimal("50"),
        "ajuste_inicial": Decimal("200"),
    },
    {
        "codigo": "FAROL-D-HB20",
        "descricao": "Farol dianteiro direito HB20",
        "categoria": "Elétrica",
        "fornecedor": "Auto Peças Silva",
        "unidade_medida": "UN",
        "custo_compra": Decimal("220.00"),
        "preco_venda": Decimal("380.00"),
        "estoque_minimo": Decimal("1"),
        "entrada_inicial": Decimal("2"),
    },
]


def run() -> None:
    db = SessionLocal()
    try:
        admin = db.query(Usuario).filter(Usuario.email == "admin@oficina.com").first()
        if admin is None:
            print("! usuário admin@oficina.com não encontrado — rode o seed_usuarios primeiro.")
            return

        fornecedores = {}
        for nome in FORNECEDORES_SEED:
            f = db.query(Fornecedor).filter(Fornecedor.nome == nome).first()
            if f is None:
                f = Fornecedor(nome=nome)
                db.add(f)
                db.flush()
                print(f"+ fornecedor criado: {nome}")
            fornecedores[nome] = f

        categorias = {}
        for nome in CATEGORIAS_SEED:
            c = db.query(CategoriaPeca).filter(CategoriaPeca.nome == nome).first()
            if c is None:
                c = CategoriaPeca(nome=nome)
                db.add(c)
                db.flush()
                print(f"+ categoria de peça criada: {nome}")
            categorias[nome] = c

        db.commit()

        for dados in PECAS_SEED:
            existente = db.query(Peca).filter(Peca.codigo == dados["codigo"]).first()
            if existente:
                print(f"- peça já existe: {dados['codigo']}")
                continue

            peca = Peca(
                codigo=dados["codigo"],
                descricao=dados["descricao"],
                categoria_id=categorias[dados["categoria"]].id,
                fornecedor_id=fornecedores[dados["fornecedor"]].id,
                unidade_medida=dados["unidade_medida"],
                custo_compra=dados["custo_compra"],
                preco_venda=dados["preco_venda"],
                estoque_minimo=dados["estoque_minimo"],
            )
            db.add(peca)
            db.commit()
            db.refresh(peca)
            print(f"+ peça criada: {peca.codigo} — {peca.descricao}")

            if "entrada_inicial" in dados:
                estoque_service.registrar_entrada(
                    db,
                    EntradaEstoqueCreate(
                        peca_id=peca.id,
                        quantidade=dados["entrada_inicial"],
                        custo_unitario=dados["custo_compra"],
                        vencimento=date.today() + timedelta(days=30),
                        observacao="Estoque inicial (seed)",
                    ),
                    usuario_id=admin.id,
                )
                print(f"  entrada registrada: +{dados['entrada_inicial']} {peca.unidade_medida}")
            elif "ajuste_inicial" in dados:
                estoque_service.registrar_ajuste(
                    db,
                    AjusteEstoqueCreate(
                        peca_id=peca.id,
                        quantidade=dados["ajuste_inicial"],
                        motivo="Inventário inicial (seed)",
                    ),
                    usuario_id=admin.id,
                )
                print(f"  ajuste registrado: +{dados['ajuste_inicial']} {peca.unidade_medida}")
    finally:
        db.close()

    print()
    print("Seed de estoque concluído.")


if __name__ == "__main__":
    run()
