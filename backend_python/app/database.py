"""pool de conexiones asincronas a postgresql (supabase) con asyncpg"""

from __future__ import annotations

import asyncio
import logging
import ssl
from collections.abc import AsyncGenerator

import asyncpg

from app.config import settings

# aca preparamos el registro de logs para los eventos de la base de datos
logger = logging.getLogger("urban.db")

# esto es igual al pool que teniamos en node permitimos maximo 10 conexiones al mismo tiempo para no saturar la base de datos
MAX_CONEXIONES = 10

# aca guardamos el pool una vez se crea para poder reutilizarlo
_pool: asyncpg.Pool | None = None
# usamos este cerrojo para evitar que multiples peticiones intenten crear el pool al mismo tiempo cuando apenas arranca el servidor
_cerrojo = asyncio.Lock()


def _contexto_ssl() -> ssl.SSLContext | None:
    # esta funcion configura la seguridad de la conexion
    # la dejamos sin validar el certificado para que conecte bien con supabase
    # esto es exactamente lo mismo que hacer rejectunauthorized false en node
    if not settings.db_ssl:
        return None

    contexto = ssl.create_default_context()
    contexto.check_hostname = False
    contexto.verify_mode = ssl.CERT_NONE
    return contexto


async def obtener_pool() -> asyncpg.Pool:
    # aca creamos el pool de conexiones la primera vez que se necesita
    # si ya existe simplemente lo devolvemos para no gastar recursos armando uno nuevo
    global _pool

    if _pool is not None:
        return _pool

    async with _cerrojo:
        if _pool is None:
            _pool = await asyncpg.create_pool(
                user=settings.db_user,
                password=settings.db_password,
                host=settings.db_host,
                port=settings.db_port,
                database=settings.db_name,
                ssl=_contexto_ssl(),
                min_size=1,
                max_size=MAX_CONEXIONES,
                timeout=15,
                # le decimos que no use cache de sentencias preparadas porque el pooler de supabase no lo soporta bien
                # en node tampoco usabamos sentencias con nombre asi que asi mantenemos la misma logica
                statement_cache_size=0,
            )
            logger.info("Pool de PostgreSQL creado (máximo %s conexiones).", MAX_CONEXIONES)

    return _pool


async def cerrar_pool() -> None:
    # esta funcion sirve para apagar todo de forma limpia y cerrar las conexiones cuando se detenga el servidor
    global _pool

    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("Pool de PostgreSQL cerrado.")


async def comprobar_conexion() -> None:
    # esto lo ejecutamos al iniciar la app para revisar que la base de datos si este viva y respondiendo
    try:
        pool = await obtener_pool()
        # hacemos una consulta super sencilla y si funciona mandamos el mensaje de exito
        await pool.fetchval("SELECT 1")
        logger.info("¡Conexión exitosa a Supabase!")
    except Exception as error:  # noqa: BLE001
        # si algo explota mostramos el error en consola pero dejamos que la app siga viva igual que pasaba en el backend viejo
        logger.error("Error conectando a Supabase: %s", error)


async def obtener_conexion() -> AsyncGenerator[asyncpg.Connection, None]:
    # esta es la dependencia que usamos en las rutas de fastapi
    # lo que hace es prestarle una conexion libre del pool a cada peticion que entra y al terminar la devuelve sola
    pool = await obtener_pool()
    async with pool.acquire() as conexion:
        yield conexion