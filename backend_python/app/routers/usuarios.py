"""Rutas de usuarios: registro, sesión, recuperación de contraseña y perfil."""

from __future__ import annotations

import logging
import re
from typing import Any

import asyncpg
from asyncpg.exceptions import UniqueViolationError
from fastapi import APIRouter, Depends

from app.database import obtener_conexion
from app.schemas import (
    ActualizarPerfilRequest,
    LoginRequest,
    RecuperarContrasenaRequest,
    RegistroUsuarioRequest,
    RestablecerContrasenaRequest,
)
from app.security import (
    ApiError,
    DURACION_TOKEN_RECUPERACION,
    DURACION_TOKEN_SESION,
    crear_token,
    decodificar_token,
    es_administrador,
    hashear_contrasena,
    usuario_autenticado,
    verificar_contrasena,
)
from app.serialization import fila_a_dict
from app.services.correo import construir_enlace_recuperacion, enviar_correo_recuperacion
from app.utils import parsear_entero

logger = logging.getLogger("urban.usuarios")

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])

EMAIL_REGEX = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
TELEFONO_REGEX = re.compile(r"^[0-9]+$")


@router.post("/registro", status_code=201)
async def registrar_usuario(
    datos: RegistroUsuarioRequest,
    conexion: asyncpg.Connection = Depends(obtener_conexion),
) -> dict[str, Any]:
    if not datos.nombre or not datos.email or not datos.contrasena:
        raise ApiError(400, "Nombre, email y contraseña son obligatorios.")

    if not EMAIL_REGEX.match(datos.email):
        raise ApiError(400, "El correo electrónico no tiene un formato válido.")

    if len(datos.contrasena) < 8:
        raise ApiError(400, "La contraseña debe tener como mínimo 8 caracteres.")

    if datos.telefono and not TELEFONO_REGEX.match(datos.telefono):
        raise ApiError(400, "El campo teléfono solo debe contener números.")

    try:
        fila = await conexion.fetchrow(
            """
            INSERT INTO usuarios (nombre, email, contrasena, telefono, direccion)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id_usuario, nombre, email, rol, fecha_registro
            """,
            datos.nombre,
            datos.email,
            hashear_contrasena(datos.contrasena),
            datos.telefono,
            datos.direccion,
        )
    except UniqueViolationError as error:
        raise ApiError(400, "El correo electrónico ya se encuentra registrado.") from error
    except Exception as error:  # noqa: BLE001
        logger.exception("Error al registrar usuario: %s", error)
        raise ApiError(500, "Error interno del servidor.") from error

    return {
        "mensaje": "Usuario registrado con éxito",
        "usuario": fila_a_dict(fila),
    }


@router.post("/login")
async def iniciar_sesion(
    datos: LoginRequest,
    conexion: asyncpg.Connection = Depends(obtener_conexion),
) -> dict[str, Any]:
    if not datos.email or not datos.contrasena:
        raise ApiError(400, "Por favor ingresa email y contraseña.")

    try:
        usuario = await conexion.fetchrow(
            "SELECT id_usuario, nombre, email, contrasena, rol FROM usuarios WHERE email = $1",
            datos.email,
        )

        if usuario is None:
            raise ApiError(404, "El correo electrónico no existe en el sistema.")

        if not verificar_contrasena(datos.contrasena, usuario["contrasena"]):
            raise ApiError(401, "Contraseña incorrecta.")

        token = crear_token(
            {
                "id": usuario["id_usuario"],
                "email": usuario["email"],
                "rol": usuario["rol"],
            },
            DURACION_TOKEN_SESION,
        )

        return {
            "mensaje": "Inicio de sesión exitoso.",
            "token": token,
            "usuario": {
                "id": usuario["id_usuario"],
                "nombre": usuario["nombre"],
                "email": usuario["email"],
                "rol": usuario["rol"],
            },
        }
    except ApiError:
        raise
    except Exception as error:  # noqa: BLE001
        logger.exception("Error al iniciar sesión: %s", error)
        raise ApiError(500, "Error en el servidor al intentar iniciar sesión.") from error


@router.post("/recuperar-contrasena")
async def recuperar_contrasena(
    datos: RecuperarContrasenaRequest,
    conexion: asyncpg.Connection = Depends(obtener_conexion),
) -> dict[str, str]:
    if not datos.email:
        raise ApiError(400, "Por favor ingresa tu correo electrónico.")

    try:
        consulta = await conexion.fetchrow(
            "SELECT id_usuario, nombre FROM usuarios WHERE email = $1",
            datos.email,
        )
        if consulta is None:
            raise ApiError(
                404, "No existe ninguna cuenta registrada con este correo."
            )

        token_recuperacion = crear_token(
            {"id": consulta["id_usuario"], "email": datos.email},
            DURACION_TOKEN_RECUPERACION,
        )
        enlace = construir_enlace_recuperacion(token_recuperacion)

        await enviar_correo_recuperacion(
            destinatario=datos.email,
            nombre=consulta["nombre"],
            enlace=enlace,
        )

        return {"mensaje": "Hemos enviado las instrucciones a tu correo electrónico."}
    except ApiError:
        raise
    except Exception as error:  # noqa: BLE001
        logger.error("Error al enviar correo: %s", error)
        raise ApiError(
            500,
            "No se pudo enviar el correo de recuperación. Revisa la configuración del servidor.",
        ) from error


@router.post("/restablecer-contrasena")
async def restablecer_contrasena(
    datos: RestablecerContrasenaRequest,
    conexion: asyncpg.Connection = Depends(obtener_conexion),
) -> dict[str, str]:
    if not datos.token or not datos.nuevaContrasena:
        raise ApiError(400, "El token y la nueva contraseña son obligatorios.")

    if len(datos.nuevaContrasena) < 8:
        raise ApiError(400, "La nueva contraseña debe tener al menos 8 caracteres.")

    try:
        verificado = decodificar_token(datos.token)
        await conexion.execute(
            "UPDATE usuarios SET contrasena = $1 WHERE id_usuario = $2",
            hashear_contrasena(datos.nuevaContrasena),
            verificado["id"],
        )
    except Exception as error:  # noqa: BLE001
        raise ApiError(
            400,
            "El enlace es inválido o ha expirado. Vuelve a solicitar la recuperación.",
        ) from error

    return {
        "mensaje": "¡Tu contraseña ha sido actualizada con éxito! Ya puedes iniciar sesión."
    }


@router.get("/perfil")
async def obtener_perfil(
    usuario: dict[str, Any] = Depends(usuario_autenticado),
    conexion: asyncpg.Connection = Depends(obtener_conexion),
) -> dict[str, Any]:
    try:
        fila = await conexion.fetchrow(
            """
            SELECT id_usuario, nombre, email, telefono, direccion, rol
            FROM usuarios WHERE id_usuario = $1
            """,
            usuario.get("id"),
        )

        if fila is None:
            raise ApiError(404, "Usuario no encontrado.")

        return fila_a_dict(fila)
    except ApiError:
        raise
    except Exception as error:  # noqa: BLE001
        logger.exception("Error al consultar el perfil: %s", error)
        raise ApiError(500, "Error al consultar el perfil.") from error


@router.put("/perfil")
async def actualizar_perfil(
    datos: ActualizarPerfilRequest,
    usuario: dict[str, Any] = Depends(usuario_autenticado),
    conexion: asyncpg.Connection = Depends(obtener_conexion),
) -> dict[str, Any]:
    id_usuario = usuario.get("id")

    if datos.telefono and not TELEFONO_REGEX.match(datos.telefono):
        raise ApiError(400, "El teléfono solo debe contener dígitos numéricos.")

    try:
        nuevo_hash: str | None = None

        if datos.nuevaContrasena:
            if not datos.contrasenaActual:
                raise ApiError(
                    400,
                    "Debes ingresar tu contraseña actual para establecer una nueva.",
                )

            if len(datos.nuevaContrasena) < 8:
                raise ApiError(
                    400, "La nueva contraseña debe tener al menos 8 caracteres."
                )

            consulta_usuario = await conexion.fetchrow(
                "SELECT contrasena FROM usuarios WHERE id_usuario = $1", id_usuario
            )
            if consulta_usuario is None:
                raise ApiError(404, "Usuario no encontrado.")

            if not verificar_contrasena(
                datos.contrasenaActual, consulta_usuario["contrasena"]
            ):
                raise ApiError(401, "La contraseña actual es incorrecta.")

            nuevo_hash = hashear_contrasena(datos.nuevaContrasena)

        fila = await conexion.fetchrow(
            """
            UPDATE usuarios
            SET contrasena = COALESCE($1, contrasena),
                telefono = COALESCE($2, telefono),
                direccion = COALESCE($3, direccion)
            WHERE id_usuario = $4
            RETURNING id_usuario, nombre, email, telefono, direccion
            """,
            nuevo_hash,
            datos.telefono,
            datos.direccion,
            id_usuario,
        )

        respuesta: dict[str, Any] = {"mensaje": "Datos actualizados correctamente."}
        if fila is not None:
            respuesta["usuario"] = fila_a_dict(fila)
        return respuesta
    except ApiError:
        raise
    except Exception as error:  # noqa: BLE001
        logger.exception("Error al actualizar el perfil: %s", error)
        raise ApiError(500, "Error interno al actualizar la información.") from error


@router.delete("/{id}")
async def eliminar_usuario(
    id: str,
    usuario: dict[str, Any] = Depends(usuario_autenticado),
    conexion: asyncpg.Connection = Depends(obtener_conexion),
) -> dict[str, str]:
    id_usuario = parsear_entero(id)

    if id_usuario != usuario.get("id") and not es_administrador(usuario):
        raise ApiError(403, "No tienes permiso para eliminar esta cuenta.")

    try:
        if id_usuario is None:
            raise ValueError(f"Identificador de usuario inválido: {id}")

        fila = await conexion.fetchrow(
            "DELETE FROM usuarios WHERE id_usuario = $1 RETURNING id_usuario",
            id_usuario,
        )

        if fila is None:
            raise ApiError(404, "Usuario no encontrado para eliminar.")

        return {"mensaje": "Usuario eliminado correctamente del sistema."}
    except ApiError:
        raise
    except Exception as error:  # noqa: BLE001
        logger.exception("Error al eliminar usuario: %s", error)
        raise ApiError(500, "Error al intentar eliminar el usuario.") from error
