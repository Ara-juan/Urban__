"""conversion de filas de postgresql a json con el mismo formato que devolvia pg"""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID


def normalizar(valor: Any) -> Any:
    # la libreria pg de node devuelve los numeros como texto por ejemplo 60000.00 asi que conservamos eso para no romper nada en el frontend
    if isinstance(valor, Decimal):
        return str(valor)

    # en node las fechas se mandaban en formato iso en utc y con milisegundos
    # aca hacemos toda esa vuelta para que salgan igualitas
    if isinstance(valor, datetime):
        if valor.tzinfo is not None:
            valor = valor.astimezone(timezone.utc).replace(tzinfo=None)
        return valor.strftime("%Y-%m-%dT%H:%M:%S.") + f"{valor.microsecond // 1000:03d}Z"

    # si es solo la fecha sin hora la pasamos a texto directo
    if isinstance(valor, date):
        return valor.isoformat()

    # los ids largos como los uuid tambien los volvemos texto para que no den problemas
    if isinstance(valor, UUID):
        return str(valor)

    # si lo que nos llega es una lista o una tupla nos toca recorrerla para limpiar cada cosa por dentro
    if isinstance(valor, list | tuple):
        return [normalizar(elemento) for elemento in valor]

    # lo mismo aplica si es un diccionario revisamos cada valor
    if isinstance(valor, dict):
        return {clave: normalizar(elemento) for clave, elemento in valor.items()}

    # si no es nada de lo de arriba lo devolvemos tal cual llego
    return valor


def fila_a_dict(fila: Any) -> dict[str, Any] | None:
    # esta funcion agarra una sola fila que nos devuelve asyncpg y la vuelve un diccionario listo para mandar al cliente
    if fila is None:
        return None
    return normalizar(dict(fila))


def filas_a_lista(filas: Any) -> list[dict[str, Any]]:
    # y esta hace exactamente lo mismo pero para cuando traemos muchas filas de un solo golpe
    return [normalizar(dict(fila)) for fila in filas]