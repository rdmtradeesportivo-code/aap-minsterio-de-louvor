from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configurações da aplicação, lidas de variáveis de ambiente (.env)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Banco de dados
    database_url: str = (
        "postgresql+psycopg://oficina:oficina@localhost:5432/oficina"
    )

    # Segurança / JWT
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8  # 8 horas (um turno de trabalho)

    # CORS — origens do frontend autorizadas a chamar a API
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # Semear usuários de teste automaticamente ao subir o container (docker-compose)
    auto_seed: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
