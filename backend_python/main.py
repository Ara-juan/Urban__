"""Punto de entrada del backend FastAPI de Urban Clothes."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import cerrar_pool, comprobar_conexion
from app.routers import productos, usuarios
from app.security import ApiError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("urban")


@asynccontextmanager
async def ciclo_de_vida(_app: FastAPI) -> AsyncGenerator[None, None]:
    # Igual que el backend Node: si falta JWT_SECRET se detiene el arranque.
    if not settings.jwt_secret:
        logger.critical("ERROR FATAL: JWT_SECRET no está definida en el archivo .env")
        raise RuntimeError("JWT_SECRET no está definida en el archivo .env")

    await comprobar_conexion()
    yield
    await cerrar_pool()


app = FastAPI(
    title="Urban Clothes API",
    description="API REST de Americanoshh (Urban Clothes) migrada de Express a FastAPI.",
    version="1.0.0",
    lifespan=ciclo_de_vida,
)

# Configuración estricta de CORS apuntando exclusivamente al frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.exception_handler(ApiError)
async def manejar_error_de_negocio(_request: Request, error: ApiError) -> JSONResponse:
    # El frontend lee `data.error`; se conserva el mismo contrato que Express.
    return JSONResponse(status_code=error.status_code, content={"error": error.mensaje})


@app.exception_handler(RequestValidationError)
async def manejar_error_de_validacion(
    _request: Request, error: RequestValidationError
) -> JSONResponse:
    logger.info("Petición inválida: %s", error.errors())
    return JSONResponse(
        status_code=400, content={"error": "Datos de la petición inválidos."}
    )


@app.exception_handler(Exception)
async def manejar_error_generico(request: Request, error: Exception) -> JSONResponse:
    logger.exception("Error no controlado en %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"error": "Error interno del servidor."})


app.include_router(usuarios.router)
app.include_router(productos.router)


@app.get("/api/salud", tags=["salud"])
async def salud() -> dict[str, str]:
    """Health check para Render: responde 200 sin depender de la base de datos."""
    return {"estado": "ok", "servicio": "urban-clothes-api"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=settings.port)