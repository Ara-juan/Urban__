"""utilidades compartidas por los routers"""

from __future__ import annotations


def parsear_entero(valor: str) -> int | None:
    # esta funcion intenta convertir un texto a numero entero parecido a lo que hacia parseint en express
    # nos sirve bastante porque todos los ids que viajan por la url siempre nos llegan en formato de texto
    try:
        return int(valor)
    except (TypeError, ValueError):
        # si nos mandan letras o algo que nada que ver devolvemos nulo para que cada ruta maneje su propio error
        return None