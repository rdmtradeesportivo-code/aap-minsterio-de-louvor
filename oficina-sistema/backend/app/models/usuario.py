from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

PERFIS_VALIDOS = ("admin", "financeiro", "recepcao", "mecanico")


class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = (
        CheckConstraint(
            f"perfil IN {PERFIS_VALIDOS}", name="ck_usuarios_perfil"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    perfil: Mapped[str] = mapped_column(String(20), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
