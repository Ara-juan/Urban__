"""Utilidades compartidas por los routers."""

from __future__ import annotations


def parsear_entero(valor: str) -> int | None:
    """Equivalente a parseInt(valor, 10): None cuando no es un entero.

    Los identificadores de la API viajan como texto, igual que en Express.
    """
    try:
        return int(valor)
    except (TypeError, ValueError):
        return None
