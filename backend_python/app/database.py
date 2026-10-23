"""Pool de conexiones asíncronas a PostgreSQL (Supabase) con asyncpg."""

from __future__ import annotations

import asyncio
import logging
import ssl
from collections.abc import AsyncGenerator

import asyncpg

from app.config import settings

logger = logging.getLogger("urban.db")

# Equivalente al pool de `pg` en el backend Node: máximo 10 conexiones.
MAX_CONEXIONES = 10

_pool: asyncpg.Pool | None = None
_cerrojo = asyncio.Lock()


def _contexto_ssl() -> ssl.SSLContext | None:
    """SSL sin validar el certificado, igual que `ssl: { rejectUnauthorized: false }`."""
    if not settings.db_ssl:
        return None

    contexto = ssl.create_default_context()
    contexto.check_hostname = False
    contexto.verify_mode = ssl.CERT_NONE
    return contexto


async def obtener_pool() -> asyncpg.Pool:
    """Crea el pool la primera vez que se necesita y lo reutiliza después."""
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
                # El pooler de Supabase (pgbouncer en transaction mode) no admite
                # prepared statements con nombre; `pg` en Node tampoco los usaba.
                statement_cache_size=0,
            )
            logger.info("Pool de PostgreSQL creado (máximo %s conexiones).", MAX_CONEXIONES)

    return _pool


async def cerrar_pool() -> None:
    global _pool

    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("Pool de PostgreSQL cerrado.")


async def comprobar_conexion() -> None:
    """Verificación de arranque: registra el mismo mensaje que el backend Node."""
    try:
        pool = await obtener_pool()
        await pool.fetchval("SELECT 1")
        logger.info("¡Conexión exitosa a Supabase!")
    except Exception as error:  # noqa: BLE001 - el servidor debe arrancar igual que en Node
        logger.error("Error conectando a Supabase: %s", error)


async def obtener_conexion() -> AsyncGenerator[asyncpg.Connection, None]:
    """Dependencia de FastAPI: una conexión del pool por petición."""
    pool = await obtener_pool()
    async with pool.acquire() as conexion:
        yield conexion
