"""Pequenos helpers de data compartilhados (evita depender de python-dateutil
para só isso)."""

from datetime import date


def primeiro_dia_do_mes(d: date) -> date:
    return d.replace(day=1)


def primeiro_dia_do_proximo_mes(d: date) -> date:
    if d.month == 12:
        return date(d.year + 1, 1, 1)
    return date(d.year, d.month + 1, 1)


def subtrair_meses(d: date, meses: int) -> date:
    """Retorna o dia 1 do mês `meses` atrás de `d`."""
    total = (d.year * 12 + (d.month - 1)) - meses
    ano, mes = divmod(total, 12)
    return date(ano, mes + 1, 1)
