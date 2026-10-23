"""Contraseñas (bcrypt), tokens JWT y dependencias de autenticación."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt
from fastapi import Depends, Header

from app.config import settings

ALGORITHM = "HS256"
SALT_ROUNDS = 10
DURACION_TOKEN_SESION = timedelta(hours=8)
DURACION_TOKEN_RECUPERACION = timedelta(hours=1)
ROLES_ADMINISTRADOR = ("ADMINISTRADOR", "admin")


class ApiError(Exception):
    """Error de negocio con el mismo cuerpo JSON que el backend Express."""

    def __init__(self, status_code: int, mensaje: str) -> None:
        super().__init__(mensaje)
        self.status_code = status_code
        self.mensaje = mensaje


def _bytes_contrasena(contrasena: str) -> bytes:
    # bcrypt (Node y Python) solo considera los primeros 72 bytes.
    return contrasena.encode("utf-8")[:72]


def hashear_contrasena(contrasena: str) -> str:
    return bcrypt.hashpw(_bytes_contrasena(contrasena), bcrypt.gensalt(rounds=SALT_ROUNDS)).decode()


def verificar_contrasena(contrasena: str, hash_guardado: str | None) -> bool:
    if not hash_guardado:
        return False
    try:
        return bcrypt.checkpw(_bytes_contrasena(contrasena), hash_guardado.encode())
    except ValueError:
        # Hash corrupto o con formato desconocido: Node devolvía false.
        return False


def crear_token(datos: dict[str, Any], duracion: timedelta) -> str:
    ahora = datetime.now(timezone.utc)
    payload = {**datos, "iat": ahora, "exp": ahora + duracion}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decodificar_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])


def es_administrador(usuario: dict[str, Any]) -> bool:
    return usuario.get("rol") in ROLES_ADMINISTRADOR


async def usuario_autenticado(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    """Equivalente a `verificarToken`: 401 si no hay token, 403 si es inválido."""
    partes = authorization.split(" ") if authorization else []
    token = partes[1] if len(partes) > 1 else None

    if not token:
        raise ApiError(401, "Acceso denegado. No se proporcionó un token.")

    try:
        return decodificar_token(token)
    except jwt.InvalidTokenError as error:
        raise ApiError(403, "Token inválido o expirado.") from error


async def administrador_requerido(
    usuario: dict[str, Any] = Depends(usuario_autenticado),
) -> dict[str, Any]:
    """Equivalente a `verificarAdmin`."""
    if es_administrador(usuario):
        return usuario
    raise ApiError(403, "Acceso denegado. Se requieren permisos de administrador.")
