"""Conversión de filas de PostgreSQL a JSON con el mismo formato que devolvía `pg`."""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID


def normalizar(valor: Any) -> Any:
    # node-pg devuelve NUMERIC como texto (p. ej. "60000.00"); se conserva ese formato.
    if isinstance(valor, Decimal):
        return str(valor)

    # node-pg serializa las fechas con Date.toJSON(): ISO 8601 en UTC con milisegundos.
    if isinstance(valor, datetime):
        if valor.tzinfo is not None:
            valor = valor.astimezone(timezone.utc).replace(tzinfo=None)
        return valor.strftime("%Y-%m-%dT%H:%M:%S.") + f"{valor.microsecond // 1000:03d}Z"

    if isinstance(valor, date):
        return valor.isoformat()

    if isinstance(valor, UUID):
        return str(valor)

    if isinstance(valor, list | tuple):
        return [normalizar(elemento) for elemento in valor]

    if isinstance(valor, dict):
        return {clave: normalizar(elemento) for clave, elemento in valor.items()}

    return valor


def fila_a_dict(fila: Any) -> dict[str, Any] | None:
    """Convierte un asyncpg.Record en un dict listo para responder."""
    if fila is None:
        return None
    return normalizar(dict(fila))


def filas_a_lista(filas: Any) -> list[dict[str, Any]]:
    return [normalizar(dict(fila)) for fila in filas]
