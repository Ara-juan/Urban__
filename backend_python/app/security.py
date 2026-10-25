"""contraseñas con bcrypt tokens jwt y dependencias de autenticacion"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt
from fastapi import Depends, Header

from app.config import settings

# aca definimos como vamos a encriptar todo y cuanto tiempo duran los permisos para cada cosa
ALGORITHM = "HS256"
SALT_ROUNDS = 10
DURACION_TOKEN_SESION = timedelta(hours=8)
DURACION_TOKEN_RECUPERACION = timedelta(hours=1)
ROLES_ADMINISTRADOR = ("ADMINISTRADOR", "admin")


class ApiError(Exception):
    # esta clase sirve para manejar los errores y devolver el mismo formato json que teniamos en el backend de express

    def __init__(self, status_code: int, mensaje: str) -> None:
        super().__init__(mensaje)
        self.status_code = status_code
        self.mensaje = mensaje


def _bytes_contrasena(contrasena: str) -> bytes:
    # tanto en python como en node bcrypt solo lee los primeros 72 bytes asi que cortamos la contraseña hasta ahi para evitar errores
    return contrasena.encode("utf-8")[:72]


def hashear_contrasena(contrasena: str) -> str:
    # aca encriptamos la contraseña agregandole la sal que definimos arriba para que sea indescifrable
    return bcrypt.hashpw(_bytes_contrasena(contrasena), bcrypt.gensalt(rounds=SALT_ROUNDS)).decode()


def verificar_contrasena(contrasena: str, hash_guardado: str | None) -> bool:
    # si por alguna razon llega vacio lo rebotamos de una
    if not hash_guardado:
        return False
    try:
        # revisamos si la clave que escribio el usuario es la misma que esta guardada
        return bcrypt.checkpw(_bytes_contrasena(contrasena), hash_guardado.encode())
    except ValueError:
        # si el hash guardado esta dañado o no se reconoce simplemente devolvemos falso tal cual lo hacia node
        return False


def crear_token(datos: dict[str, Any], duracion: timedelta) -> str:
    # aca armamos el token con los datos del usuario la hora actual y la hora en la que se va a vencer
    ahora = datetime.now(timezone.utc)
    payload = {**datos, "iat": ahora, "exp": ahora + duracion}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decodificar_token(token: str) -> dict[str, Any]:
    # leemos el token para sacar la info del usuario y de paso la libreria valida solita si ya expiro
    return jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])


def es_administrador(usuario: dict[str, Any]) -> bool:
    # verificamos rapido si el rol del usuario que nos mandan cuenta como administrador
    return usuario.get("rol") in ROLES_ADMINISTRADOR


async def usuario_autenticado(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    # esto es igualito a verificar token en express si no hay token mandamos error 401 y si no sirve mandamos 403
    partes = authorization.split(" ") if authorization else []
    token = partes[1] if len(partes) > 1 else None

    # si no nos mandaron nada los bloqueamos
    if not token:
        raise ApiError(401, "Acceso denegado. No se proporcionó un token.")

    try:
        # si el token es bueno devolvemos los datos de la persona
        return decodificar_token(token)
    except jwt.InvalidTokenError as error:
        raise ApiError(403, "Token inválido o expirado.") from error


async def administrador_requerido(
    usuario: dict[str, Any] = Depends(usuario_autenticado),
) -> dict[str, Any]:
    # esto hace lo mismo que verificar admin en el backend anterior bloqueando el paso a los que no tienen permiso
    if es_administrador(usuario):
        return usuario
    raise ApiError(403, "Acceso denegado. Se requieren permisos de administrador.")