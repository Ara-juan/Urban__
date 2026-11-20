# rutas de usuarios registro verificacion de correo sesion recuperacion de contrasena perfil y favoritos

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
    BloqueoUsuarioRequest,
    LoginRequest,
    RecuperarContrasenaRequest,
    ReenviarVerificacionRequest,
    RegistroUsuarioRequest,
    RestablecerContrasenaRequest,
    VerificarEmailRequest,
)
from app.security import (
    ApiError,
    DURACION_TOKEN_RECUPERACION,
    DURACION_TOKEN_SESION,
    administrador_requerido,
    crear_token,
    decodificar_token,
    es_administrador,
    hashear_contrasena,
    usuario_autenticado,
    verificar_contrasena,
)
from app.serialization import fila_a_dict, filas_a_lista
from app.services.correo import (
    construir_enlace_recuperacion,
    construir_enlace_verificacion,
    enviar_correo_recuperacion,
    enviar_correo_verificacion,
)
from app.utils import parsear_entero

# inicializamos esto para guardar registro de los errores por consola
logger = logging.getLogger("urban.usuarios")

# creamos el enrutador que va a manejar todas las peticiones de los usuarios
router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])

# usamos estas expresiones regulares para verificar que escriban bien el correo y el celular
EMAIL_REGEX = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
TELEFONO_REGEX = re.compile(r"^[0-9]+$")


@router.post("/registro", status_code=201)
async def registrar_usuario(
    datos: RegistroUsuarioRequest,
    conexion: asyncpg.Connection = Depends(obtener_conexion),
) -> dict[str, Any]:
    # primero verificamos que no dejen en blanco los datos mas importantes
    if not datos.nombre or not datos.email or not datos.contrasena:
        raise ApiError(400, "Nombre, email y contraseña son obligatorios.")

    # comprobamos que el correo tenga sentido y no sea un texto cualquiera
    if not EMAIL_REGEX.match(datos.email):
        raise ApiError(400, "El correo electrónico no tiene un formato válido.")

    # por seguridad le pedimos que su clave no sea tan corta
    if len(datos.contrasena) < 8:
        raise ApiError(400, "La contraseña debe tener como mínimo 8 caracteres.")

    # si puso telefono revisamos que de verdad sean solo numeros
    if datos.telefono and not TELEFONO_REGEX.match(datos.telefono):
        raise ApiError(400, "El campo teléfono solo debe contener números.")

    # validamos que el usuario haya aceptado expresamente el tratamiento de datos
    if datos.acepto_politica is not True:
        raise ApiError(
            400,
            "Es obligatorio aceptar la política de tratamiento de datos personales para registrarse.",
        )

    correo_limpio = datos.email.strip().lower()
    nombre_limpio = datos.nombre.strip()

    try:
        # usamos transaccion para que si brevo falla al enviar el correo no quede creada una cuenta sin confirmar
        async with conexion.transaction():
            fila = await conexion.fetchrow(
                """
                INSERT INTO usuarios (
                    nombre, email, contrasena, telefono, direccion,
                    rol, acepto_politica, fecha_aceptacion_politica, email_verificado
                )
                VALUES ($1, $2, $3, $4, $5, 'CLIENTE', TRUE, NOW(), FALSE)
                RETURNING id_usuario, nombre, email, rol, fecha_registro,
                          acepto_politica, fecha_aceptacion_politica, email_verificado
                """,
                nombre_limpio,
                correo_limpio,
                hashear_contrasena(datos.contrasena),
                datos.telefono,
                datos.direccion,
            )

            token_verificacion = crear_token(
                {
                    "id": fila["id_usuario"],
                    "email": correo_limpio,
                    "proposito": "verificar_email",
                },
                DURACION_TOKEN_SESION,
            )
            enlace = construir_enlace_verificacion(token_verificacion)

            await enviar_correo_verificacion(
                destinatario=correo_limpio,
                nombre=nombre_limpio,
                enlace=enlace,
            )
    except UniqueViolationError as error:
        # este error salta si alguien intenta registrar un correo que ya existe
        raise ApiError(400, "El correo electrónico ya se encuentra registrado.") from error
    except RuntimeError as error:
        logger.error("Error al enviar correo de verificación en registro: %s", error)
        raise ApiError(
            500,
            "No pudimos enviar el correo de verificación. Revisa que tu dirección esté bien escrita e inténtalo de nuevo.",
        ) from error
    except Exception as error:  # noqa: BLE001
        logger.exception("Error al registrar usuario: %s", error)
        raise ApiError(500, "Error interno del servidor.") from error

    return {
        "mensaje": "¡Cuenta creada! Te enviamos un enlace de verificación a tu correo (revisa también Spam) para activar tu acceso.",
        "requiere_verificacion": True,
        "usuario": fila_a_dict(fila),
    }


@router.post("/verificar-email")
async def verificar_email(
    datos: VerificarEmailRequest,
    conexion: asyncpg.Connection = Depends(obtener_conexion),
) -> dict[str, str]:
    # confirma que el correo pertenece al usuario cuando pulsa el enlace recibido en su bandeja
    if not datos.token:
        raise ApiError(400, "El token de verificación es obligatorio.")

    try:
        payload = decodificar_token(datos.token)
    except Exception as error:  # noqa: BLE001
        raise ApiError(
            400,
            "El enlace de verificación es inválido o ha expirado. Solicita uno nuevo desde el inicio de sesión.",
        ) from error

    if payload.get("proposito") != "verificar_email" or not payload.get("id"):
        raise ApiError(400, "El token proporcionado no corresponde a una verificación de correo.")

    try:
        usuario = await conexion.fetchrow(
            "SELECT id_usuario, email_verificado FROM usuarios WHERE id_usuario = $1",
            payload["id"],
        )
        if usuario is None:
            raise ApiError(404, "La cuenta asociada a este enlace ya no existe.")

        if usuario["email_verificado"]:
            return {
                "mensaje": "Tu correo electrónico ya estaba verificado. Ya puedes iniciar sesión."
            }

        await conexion.execute(
            "UPDATE usuarios SET email_verificado = TRUE WHERE id_usuario = $1",
            payload["id"],
        )

        return {
            "mensaje": "¡Correo electrónico verificado con éxito! Tu cuenta ya está activa, inicia sesión para continuar."
        }
    except ApiError:
        raise
    except Exception as error:  # noqa: BLE001
        logger.exception("Error al verificar email: %s", error)
        raise ApiError(500, "Error interno al verificar el correo electrónico.") from error


@router.post("/reenviar-verificacion")
async def reenviar_verificacion(
    datos: ReenviarVerificacionRequest,
    conexion: asyncpg.Connection = Depends(obtener_conexion),
) -> dict[str, str]:
    # permite volver a enviar el enlace de confirmacion si el usuario no lo encontro o caduco
    if not datos.email:
        raise ApiError(400, "Por favor ingresa tu correo electrónico.")

    try:
        consulta = await conexion.fetchrow(
            """
            SELECT id_usuario, nombre, email, bloqueado, email_verificado
            FROM usuarios
            WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))
            """,
            datos.email,
        )
        if consulta is None:
            raise ApiError(404, "No existe ninguna cuenta registrada con este correo.")

        if consulta["bloqueado"]:
            raise ApiError(403, "Esta cuenta se encuentra bloqueada y no puede verificarse.")

        if consulta["email_verificado"]:
            raise ApiError(
                400,
                "Este correo electrónico ya está verificado. Puedes iniciar sesión directamente.",
            )

        token_verificacion = crear_token(
            {
                "id": consulta["id_usuario"],
                "email": consulta["email"],
                "proposito": "verificar_email",
            },
            DURACION_TOKEN_SESION,
        )
        enlace = construir_enlace_verificacion(token_verificacion)

        await enviar_correo_verificacion(
            destinatario=consulta["email"],
            nombre=consulta["nombre"],
            enlace=enlace,
        )

        return {
            "mensaje": "Te enviamos un nuevo enlace de verificación. Revisa tu bandeja de entrada o carpeta de spam."
        }
    except ApiError:
        raise
    except Exception as error:  # noqa: BLE001
        logger.error("Error al reenviar correo de verificación: %s", error)
        raise ApiError(
            500,
            "No se pudo reenviar el correo de verificación. Inténtalo más tarde.",
        ) from error


@router.post("/login")
async def iniciar_sesion(
    datos: LoginRequest,
    conexion: asyncpg.Connection = Depends(obtener_conexion),
) -> dict[str, Any]:
    # aca comprobamos que el usuario mande correo y clave para poder entrar
    if not datos.email or not datos.contrasena:
        raise ApiError(400, "Por favor ingresa email y contraseña.")

    try:
        # buscamos al usuario usando su correo (sin distinguir mayusculas/minusculas)
        usuario = await conexion.fetchrow(
            """
            SELECT id_usuario, nombre, email, contrasena, telefono, direccion,
                   rol, bloqueado, motivo_bloqueo, email_verificado
            FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))
            """,
            datos.email,
        )

        # si no encontramos nada le avisamos que el correo no existe aca
        if usuario is None:
            raise ApiError(404, "El correo electrónico no existe en el sistema.")

        # revisamos que la clave que escribio coincida con la que tenemos guardada
        if not verificar_contrasena(datos.contrasena, usuario["contrasena"]):
            raise ApiError(401, "Contraseña incorrecta.")

        # si la cuenta fue bloqueada por el administrador impedimos el acceso
        if usuario["bloqueado"]:
            motivo = (
                f" Motivo: {usuario['motivo_bloqueo']}"
                if usuario["motivo_bloqueo"]
                else ""
            )
            raise ApiError(
                403,
                f"Tu cuenta ha sido bloqueada por un administrador.{motivo}",
            )

        # exigimos que haya confirmado que su correo electronico es real antes de darle sesion
        if not usuario["email_verificado"] and not es_administrador(dict(usuario)):
            raise ApiError(
                403,
                "Debes verificar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada o spam.",
            )

        # si todo salio bien le armamos un token con el rol que tiene en la BD (CLIENTE o ADMINISTRADOR)
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
                "telefono": usuario["telefono"],
                "direccion": usuario["direccion"],
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
    # esta parte sirve para cuando a la gente se le olvida su clave
    if not datos.email:
        raise ApiError(400, "Por favor ingresa tu correo electrónico.")

    try:
        # primero miramos si el correo si lo tenemos registrado
        consulta = await conexion.fetchrow(
            "SELECT id_usuario, nombre, bloqueado FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))",
            datos.email,
        )
        if consulta is None:
            raise ApiError(
                404, "No existe ninguna cuenta registrada con este correo."
            )

        if consulta["bloqueado"]:
            raise ApiError(
                403,
                "Esta cuenta se encuentra bloqueada y no puede solicitar recuperación.",
            )

        # le generamos un token temporal para que pueda cambiar la clave seguro
        token_recuperacion = crear_token(
            {"id": consulta["id_usuario"], "email": datos.email},
            DURACION_TOKEN_RECUPERACION,
        )
        enlace = construir_enlace_recuperacion(token_recuperacion)

        # enviamos el correo con el enlace que le acabamos de armar
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
    # con este endpoint ya le definimos la clave nueva despues de que uso el link del correo
    if not datos.token or not datos.nuevaContrasena:
        raise ApiError(400, "El token y la nueva contraseña son obligatorios.")

    if len(datos.nuevaContrasena) < 8:
        raise ApiError(400, "La nueva contraseña debe tener al menos 8 caracteres.")

    try:
        # leemos el token para saber de que usuario estamos hablando y de paso miramos que no haya expirado
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
    # aca el usuario logueado pide ver su informacion personal
    try:
        # sacamos el id del token y con eso buscamos todos sus datos
        fila = await conexion.fetchrow(
            """
            SELECT id_usuario, nombre, email, telefono, direccion, rol,
                   acepto_politica, fecha_aceptacion_politica, email_verificado
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
    # endpoint para que el usuario pueda cambiar cosas como su direccion telefono o su clave
    id_usuario = usuario.get("id")

    # nos aseguramos que no metan letras en el telefono si es que lo quieren actualizar
    if datos.telefono and not TELEFONO_REGEX.match(datos.telefono):
        raise ApiError(400, "El teléfono solo debe contener dígitos numéricos.")

    try:
        nuevo_hash: str | None = None

        # si el usuario nos mando clave nueva le pedimos la vieja obligatoriamente
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

            # traemos la clave vieja de la base de datos para compararla
            consulta_usuario = await conexion.fetchrow(
                "SELECT contrasena FROM usuarios WHERE id_usuario = $1", id_usuario
            )
            if consulta_usuario is None:
                raise ApiError(404, "Usuario no encontrado.")

            # si la clave vieja no cuadra no lo dejamos cambiarla
            if not verificar_contrasena(
                datos.contrasenaActual, consulta_usuario["contrasena"]
            ):
                raise ApiError(401, "La contraseña actual es incorrecta.")

            # encriptamos la clave nueva para poderla guardar
            nuevo_hash = hashear_contrasena(datos.nuevaContrasena)

        # usamos coalesce igual que en los productos para que lo que venga vacio se quede como estaba
        fila = await conexion.fetchrow(
            """
            UPDATE usuarios
            SET contrasena = COALESCE($1, contrasena),
                telefono = COALESCE($2, telefono),
                direccion = COALESCE($3, direccion)
            WHERE id_usuario = $4
            RETURNING id_usuario, nombre, email, telefono, direccion, rol
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


# --- LISTA DE FAVORITOS DEL USUARIO ("GUARDAR PARA QUINCENA") ---


@router.get("/favoritos")
async def obtener_favoritos(
    usuario: dict[str, Any] = Depends(usuario_autenticado),
    conexion: asyncpg.Connection = Depends(obtener_conexion),
) -> list[dict[str, Any]]:
    # devuelve las prendas activas guardadas en favoritos por el usuario autenticado
    try:
        filas = await conexion.fetch(
            """
            SELECT p.id_producto, p.titulo, p.descripcion, p.precio,
                   p.imagen_url, p.categoria, p.tallas, p.estado,
                   f.fecha_agregado
            FROM favoritos f
            INNER JOIN productos p ON p.id_producto = f.id_producto
            WHERE f.id_usuario = $1 AND p.estado = 'activo'
            ORDER BY f.fecha_agregado DESC
            """,
            usuario.get("id"),
        )
        return filas_a_lista(filas)
    except Exception as error:  # noqa: BLE001
        logger.exception("Error al consultar favoritos: %s", error)
        raise ApiError(500, "Error interno al consultar tus favoritos.") from error


@router.post("/favoritos/{id_producto}", status_code=201)
async def agregar_favorito(
    id_producto: str,
    usuario: dict[str, Any] = Depends(usuario_autenticado),
    conexion: asyncpg.Connection = Depends(obtener_conexion),
) -> dict[str, str]:
    # guarda una prenda en la lista de favoritos del usuario
    prod_id = parsear_entero(id_producto)
    if prod_id is None:
        raise ApiError(400, "Identificador de producto inválido.")

    try:
        existe = await conexion.fetchrow(
            "SELECT id_producto FROM productos WHERE id_producto = $1 AND estado = 'activo'",
            prod_id,
        )
        if existe is None:
            raise ApiError(404, "La prenda no existe o no está disponible.")

        await conexion.execute(
            """
            INSERT INTO favoritos (id_usuario, id_producto)
            VALUES ($1, $2)
            ON CONFLICT (id_usuario, id_producto) DO NOTHING
            """,
            usuario.get("id"),
            prod_id,
        )
        return {"mensaje": "Prenda guardada en tus favoritos."}
    except ApiError:
        raise
    except Exception as error:  # noqa: BLE001
        logger.exception("Error al guardar favorito: %s", error)
        raise ApiError(500, "No se pudo guardar la prenda en favoritos.") from error


@router.delete("/favoritos/{id_producto}")
async def eliminar_favorito(
    id_producto: str,
    usuario: dict[str, Any] = Depends(usuario_autenticado),
    conexion: asyncpg.Connection = Depends(obtener_conexion),
) -> dict[str, str]:
    # quita una prenda de la lista de favoritos del usuario
    prod_id = parsear_entero(id_producto)
    if prod_id is None:
        raise ApiError(400, "Identificador de producto inválido.")

    try:
        await conexion.execute(
            "DELETE FROM favoritos WHERE id_usuario = $1 AND id_producto = $2",
            usuario.get("id"),
            prod_id,
        )
        return {"mensaje": "Prenda eliminada de tus favoritos."}
    except Exception as error:  # noqa: BLE001
        logger.exception("Error al eliminar favorito: %s", error)
        raise ApiError(500, "No se pudo quitar la prenda de favoritos.") from error


@router.get("")
async def listar_usuarios(
    _: dict[str, Any] = Depends(administrador_requerido),
    conexion: asyncpg.Connection = Depends(obtener_conexion),
) -> list[dict[str, Any]]:
    # lista todos los usuarios registrados para que el administrador pueda gestionarlos
    try:
        filas = await conexion.fetch(
            """
            SELECT id_usuario, nombre, email, telefono, direccion, rol,
                   fecha_registro, acepto_politica, fecha_aceptacion_politica,
                   email_verificado, bloqueado, motivo_bloqueo, fecha_bloqueo
            FROM usuarios
            ORDER BY id_usuario DESC
            """
        )
        return [fila_a_dict(fila) for fila in filas]
    except Exception as error:  # noqa: BLE001
        logger.exception("Error al listar usuarios: %s", error)
        raise ApiError(500, "Error interno al consultar los usuarios.") from error


@router.put("/{id}/bloqueo")
async def cambiar_bloqueo_usuario(
    id: str,
    datos: BloqueoUsuarioRequest,
    admin: dict[str, Any] = Depends(administrador_requerido),
    conexion: asyncpg.Connection = Depends(obtener_conexion),
) -> dict[str, Any]:
    # permite al administrador bloquear o desbloquear una cuenta de usuario
    id_usuario = parsear_entero(id)
    if id_usuario is None:
        raise ApiError(400, "Identificador de usuario inválido.")

    if id_usuario == admin.get("id"):
        raise ApiError(400, "No puedes bloquear tu propia cuenta de administrador.")

    try:
        objetivo = await conexion.fetchrow(
            "SELECT id_usuario, nombre, email, rol FROM usuarios WHERE id_usuario = $1",
            id_usuario,
        )
        if objetivo is None:
            raise ApiError(404, "Usuario no encontrado.")

        if es_administrador(dict(objetivo)):
            raise ApiError(403, "No está permitido bloquear a otro administrador.")

        motivo_limpio = (datos.motivo or "").strip() or None
        if datos.bloqueado and not motivo_limpio:
            motivo_limpio = "Actividad sospechosa o incumplimiento de normas."

        fila = await conexion.fetchrow(
            """
            UPDATE usuarios
            SET bloqueado = $1,
                motivo_bloqueo = $2,
                fecha_bloqueo = CASE WHEN $1 THEN NOW() ELSE NULL END
            WHERE id_usuario = $3
            RETURNING id_usuario, nombre, email, telefono, direccion, rol,
                      fecha_registro, email_verificado, bloqueado, motivo_bloqueo, fecha_bloqueo
            """,
            datos.bloqueado,
            motivo_limpio if datos.bloqueado else None,
            id_usuario,
        )

        accion = "bloqueado" if datos.bloqueado else "desbloqueado"
        return {
            "mensaje": f"Usuario {accion} correctamente.",
            "usuario": fila_a_dict(fila),
        }
    except ApiError:
        raise
    except Exception as error:  # noqa: BLE001
        logger.exception("Error al actualizar estado de bloqueo: %s", error)
        raise ApiError(500, "Error interno al actualizar el bloqueo del usuario.") from error


@router.delete("/{id}")
async def eliminar_usuario(
    id: str,
    usuario: dict[str, Any] = Depends(usuario_autenticado),
    conexion: asyncpg.Connection = Depends(obtener_conexion),
) -> dict[str, str]:
    # con esto borramos la cuenta de alguien para siempre
    id_usuario = parsear_entero(id)

    # aca nos aseguramos que solo el dueño de la cuenta o un admin pueda borrarla
    if id_usuario != usuario.get("id") and not es_administrador(usuario):
        raise ApiError(403, "No tienes permiso para eliminar esta cuenta.")

    try:
        if id_usuario is None:
            raise ValueError(f"Identificador de usuario inválido: {id}")

        objetivo = await conexion.fetchrow(
            "SELECT rol FROM usuarios WHERE id_usuario = $1",
            id_usuario,
        )
        if objetivo is None:
            raise ApiError(404, "Usuario no encontrado para eliminar.")

        if es_administrador(dict(objetivo)):
            raise ApiError(403, "La cuenta de administrador no puede ser eliminada.")

        await conexion.execute(
            "DELETE FROM usuarios WHERE id_usuario = $1",
            id_usuario,
        )

        return {"mensaje": "Usuario eliminado correctamente del sistema."}
    except ApiError:
        raise
    except Exception as error:  # noqa: BLE001
        logger.exception("Error al eliminar usuario: %s", error)
        raise ApiError(500, "Error al intentar eliminar el usuario.") from error