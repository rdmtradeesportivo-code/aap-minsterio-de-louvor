"""Seed de dados de teste — Módulo 1 (Usuários e Autenticação).

Cria um usuário de teste para cada perfil, com senha conhecida, para que o
sistema possa ser validado na tela de login antes de avançar para o próximo
módulo.

Uso:
    python -m app.seeds.seed_usuarios
"""

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.usuario import Usuario

SENHA_PADRAO = "oficina123"

USUARIOS_SEED = [
    {"nome": "Admin Geral", "email": "admin@oficina.com", "perfil": "admin"},
    {"nome": "Financeiro Oficina", "email": "financeiro@oficina.com", "perfil": "financeiro"},
    {"nome": "Recepção Oficina", "email": "recepcao@oficina.com", "perfil": "recepcao"},
    {"nome": "Mecânico Teste", "email": "mecanico@oficina.com", "perfil": "mecanico"},
]


def run() -> None:
    db = SessionLocal()
    try:
        for dados in USUARIOS_SEED:
            existente = db.query(Usuario).filter(Usuario.email == dados["email"]).first()
            if existente:
                print(f"- já existe: {dados['email']} (perfil={dados['perfil']})")
                continue

            usuario = Usuario(
                nome=dados["nome"],
                email=dados["email"],
                perfil=dados["perfil"],
                senha_hash=hash_password(SENHA_PADRAO),
            )
            db.add(usuario)
            print(f"+ criado: {dados['email']} (perfil={dados['perfil']})")

        db.commit()
    finally:
        db.close()

    print()
    print("Seed concluído. Credenciais de teste (senha igual para todos):")
    for dados in USUARIOS_SEED:
        print(f"  {dados['email']:28s}  senha: {SENHA_PADRAO}  perfil: {dados['perfil']}")


if __name__ == "__main__":
    run()
