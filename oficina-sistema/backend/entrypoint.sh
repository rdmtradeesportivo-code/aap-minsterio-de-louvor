#!/bin/sh
set -e

echo "Aplicando migrations (alembic upgrade head)..."
alembic upgrade head

if [ "$AUTO_SEED" = "true" ]; then
  echo "Rodando seeds de teste..."
  python -m app.seeds.seed_usuarios
  python -m app.seeds.seed_clientes
fi

echo "Iniciando API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
