"""adiciona status 'cancelado' a ordens_servico

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-06

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

NOVO_CHECK = (
    "status IN ('orcamento','aprovado','em_execucao','aguardando_peca',"
    "'concluido','faturado','pago','cancelado')"
)
CHECK_ANTIGO = (
    "status IN ('orcamento','aprovado','em_execucao','aguardando_peca',"
    "'concluido','faturado','pago')"
)


def upgrade() -> None:
    op.drop_constraint("ck_ordens_servico_status", "ordens_servico", type_="check")
    op.create_check_constraint("ck_ordens_servico_status", "ordens_servico", NOVO_CHECK)

    # Motivo do cancelamento (só preenchido nessa transição; demais ficam NULL).
    op.add_column("os_status_log", sa.Column("motivo", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("os_status_log", "motivo")

    op.drop_constraint("ck_ordens_servico_status", "ordens_servico", type_="check")
    op.create_check_constraint("ck_ordens_servico_status", "ordens_servico", CHECK_ANTIGO)
