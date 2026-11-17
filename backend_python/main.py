"""punto de entrada del backend fastapi de urban clothes"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from asyncpg.exceptions import UniqueViolationError
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import cerrar_pool, comprobar_conexion, obtener_conexion
from app.routers import productos, usuarios
from app.security import ApiError, hashear_contrasena

# configuramos el registro de eventos para ver todo lo que pasa en la consola
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("urban")


async def inicializar_administrador() -> None:
    # verifica o crea de antemano la cuenta predefinida con rol ADMINISTRADOR
    if not settings.admin_email:
        return

    async for conexion in obtener_conexion():
        existente = await conexion.fetchrow(
            "SELECT id_usuario, rol FROM usuarios WHERE LOWER(TRIM(email)) = LOWER($1)",
            settings.admin_email,
        )

        if existente is not None:
            logger.info(
                "Cuenta administradora verificada (%s | rol=%s).",
                settings.admin_email,
                existente["rol"],
            )
            return

        if not settings.admin_password:
            logger.warning(
                "ADMIN_PASSWORD no está definida en .env; no se creó la cuenta %s automáticamente.",
                settings.admin_email,
            )
            return

        if len(settings.admin_password) < 8:
            logger.warning(
                "ADMIN_PASSWORD debe tener al menos 8 caracteres para crear la cuenta administradora."
            )
            return

        try:
            await conexion.execute(
                """
                INSERT INTO usuarios (
                    nombre, email, contrasena, rol,
                    acepto_politica, fecha_aceptacion_politica, bloqueado
                )
                VALUES ($1, $2, $3, 'ADMINISTRADOR', TRUE, NOW(), FALSE)
                """,
                settings.admin_nombre,
                settings.admin_email,
                hashear_contrasena(settings.admin_password),
            )
            logger.info(
                "Cuenta administradora inicializada en la base de datos: %s",
                settings.admin_email,
            )
        except UniqueViolationError as error:
            logger.error(
                "No se pudo crear el administrador (%s) por restricción única en BD: %s. "
                "Cambia ADMIN_NOMBRE o revisa registros duplicados en Supabase.",
                settings.admin_email,
                error,
            )


@asynccontextmanager
async def ciclo_de_vida(_app: FastAPI) -> AsyncGenerator[None, None]:
    # aca controlamos lo que pasa cuando el servidor arranca y se apaga
    # si no configuraron la clave secreta frenamos todo de una vez igual que haciamos en node
    if not settings.jwt_secret:
        logger.critical("ERROR FATAL JWT_SECRET no está definida en el archivo .env")
        raise RuntimeError("JWT_SECRET no está definida en el archivo .env")

    # verificamos que la base de datos responda antes de recibir peticiones
    await comprobar_conexion()
    # aseguramos que el usuario administrador predefinido exista en la BD
    await inicializar_administrador()
    yield
    # y cuando el servidor se apague cerramos el pool de conexiones de forma limpia
    await cerrar_pool()


# creamos la aplicacion principal con sus datos basicos
app = FastAPI(
    title="Urban Clothes API",
    description="API REST de Americanoshh migrada de Express a FastAPI",
    version="1.0.0",
    lifespan=ciclo_de_vida,
)

# le ponemos limites estrictos para que solo nuestro frontend pueda hacer peticiones
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.exception_handler(ApiError)
async def manejar_error_de_negocio(_request: Request, error: ApiError) -> JSONResponse:
    # manejamos los errores personalizados para que devuelvan el mismo json que esperaba el frontend con express
    return JSONResponse(status_code=error.status_code, content={"error": error.mensaje})


@app.exception_handler(RequestValidationError)
async def manejar_error_de_validacion(
    _request: Request, error: RequestValidationError
) -> JSONResponse:
    # si nos mandan datos mal armados avisamos sin dejar que se caiga el servidor
    logger.info("Petición inválida %s", error.errors())
    return JSONResponse(
        status_code=400, content={"error": "Datos de la petición inválidos."}
    )


@app.exception_handler(Exception)
async def manejar_error_generico(request: Request, error: Exception) -> JSONResponse:
    # si pasa algun error raro que no teniamos previsto lo guardamos en el log y mandamos error interno
    logger.exception("Error no controlado en %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"error": "Error interno del servidor."})


# enchufamos las rutas de los usuarios y de los productos a la aplicacion
app.include_router(usuarios.router)
app.include_router(productos.router)


@app.get("/api/salud", tags=["salud"])
async def salud() -> dict[str, str]:
    # este endpoint lo usa render para saber si el servidor esta vivo sin tocar la base de datos
    return {"estado": "ok", "servicio": "urban-clothes-api"}


if __name__ == "__main__":
    import uvicorn

    # arrancamos el servidor usando el puerto que sacamos de las variables de entorno
    uvicorn.run(app, host="0.0.0.0", port=settings.port)