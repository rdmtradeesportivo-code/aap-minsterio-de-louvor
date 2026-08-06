from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.routers import (
    auth,
    clientes,
    dashboards,
    estoque,
    financeiro,
    folha,
    funcionarios,
    metas_orcamento,
    ordens_servico,
    usuarios,
    veiculos,
)

settings = get_settings()

app = FastAPI(
    title="Oficina/Funilaria — Sistema de Gestão",
    description="API do sistema de gestão para oficina/funilaria",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(clientes.router)
app.include_router(veiculos.router)
app.include_router(estoque.router_fornecedores)
app.include_router(estoque.router_categorias_peca)
app.include_router(estoque.router_pecas)
app.include_router(estoque.router_movimentacoes)
app.include_router(funcionarios.router)
app.include_router(ordens_servico.router)
app.include_router(financeiro.router)
app.include_router(folha.router)
app.include_router(metas_orcamento.router)
app.include_router(dashboards.router)

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/api/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
