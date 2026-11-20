# envio de correos transaccionales:
# - resend para recuperacion de contrasena
# - brevo para verificacion de correo electronico en registros nuevos

from __future__ import annotations

import logging

import httpx

from app.config import settings

# preparamos esto para poder guardar en la consola cualquier error que pase con los correos
logger = logging.getLogger("urban.correo")

# configuracion de resend (recuperacion de clave)
RESEND_URL = "https://api.resend.com/emails"
ASUNTO = "Recuperación de Contraseña — Americanoshh"

# configuracion de brevo (verificacion de correo real)
BREVO_URL = "https://api.brevo.com/v3/smtp/email"
ASUNTO_VERIFICACION = "Verifica tu correo electrónico — Americanoshh"


def construir_enlace_recuperacion(token: str) -> str:
    # armamos el link completo apuntando al dominio del frontend para que el usuario pueda hacer click
    return f"{settings.frontend_url}/login?resetToken={token}"


def construir_enlace_verificacion(token: str) -> str:
    # armamos el link de activacion de cuenta que redirige al login con el token de verificacion
    return f"{settings.frontend_url}/login?verifyToken={token}"


def construir_html_recuperacion(nombre: str | None, enlace: str) -> str:
    # este es el diseño completo del correo metido en html para que se vea igual de bien en cualquier lado
    return f"""
      <div style="font-family: Arial, sans-serif; background-color: #121212; color: #ffffff; padding: 25px; border-radius: 10px;">
        <h2 style="color: #007BFF; text-align: center;">Americanoshh</h2>
        <p>Hola, <strong>{nombre or 'Cliente'}</strong>.</p>
        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
        <p>Haz clic en el siguiente botón para crear una nueva contraseña (expira en 1 hora):</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="{enlace}" target="_blank" style="background-color: #007BFF; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Restablecer Contraseña</a>
        </div>

        <p style="font-size: 13px; color: #cccccc; word-break: break-all;">
          Si el botón no abre automáticamente, copia y pega este enlace directo en tu navegador:<br><br>
          <a href="{enlace}" target="_blank" style="color: #007BFF;">{enlace}</a>
        </p>

        <p style="font-size: 12px; color: #aaaaaa; margin-top: 20px;">Si tú no solicitaste este cambio, puedes ignorar este mensaje de forma segura.</p>
      </div>
    """


def construir_html_verificacion(nombre: str | None, enlace: str) -> str:
    # plantilla html para confirmar que el correo pertenece realmente al usuario que se registro
    return f"""
      <div style="font-family: Arial, sans-serif; background-color: #121212; color: #ffffff; padding: 25px; border-radius: 10px;">
        <h2 style="color: #00ffcc; text-align: center;">Americanoshh</h2>
        <p>¡Bienvenido, <strong>{nombre or 'Cliente'}</strong>!</p>
        <p>Gracias por crear tu cuenta en <strong>Americanoshh</strong>. Para activar tus beneficios y poder iniciar sesión, confirma que este correo electrónico es tuyo:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="{enlace}" target="_blank" style="background-color: #00ffcc; color: #111111; padding: 12px 26px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verificar mi correo</a>
        </div>

        <p style="font-size: 13px; color: #cccccc; word-break: break-all;">
          Si el botón no abre automáticamente, copia y pega este enlace directo en tu navegador:<br><br>
          <a href="{enlace}" target="_blank" style="color: #00ffcc;">{enlace}</a>
        </p>

        <p style="font-size: 12px; color: #aaaaaa; margin-top: 20px;">Si tú no creaste esta cuenta, puedes ignorar este mensaje sin problema.</p>
      </div>
    """


async def enviar_correo_recuperacion(destinatario: str, nombre: str | None, enlace: str) -> None:
    # primero comprobamos que la llave de resend si este configurada porque sin eso todo falla
    if not settings.resend_api_key:
        logger.error(
            "RESEND_API_KEY no está configurada: no se puede enviar el correo de recuperación."
        )
        raise RuntimeError("RESEND_API_KEY no está configurada en el servidor.")

    # alistamos los datos de envio con quien manda a quien le llega y el diseño del correo
    cuerpo = {
        "from": settings.resend_from,
        "to": [destinatario],
        "subject": ASUNTO,
        "html": construir_html_recuperacion(nombre, enlace),
    }
    cabeceras = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.resend_api_key}",
    }

    # disparamos la peticion al servidor y le ponemos un tiempo maximo de espera para que no se quede bloqueado
    async with httpx.AsyncClient(timeout=15) as cliente:
        respuesta = await cliente.post(RESEND_URL, headers=cabeceras, json=cuerpo)

    # si la api nos bota un error lo intentamos leer para ver que paso y lanzamos la alerta
    if respuesta.status_code >= 400:
        try:
            detalle = respuesta.json()
        except ValueError:
            detalle = respuesta.text
        logger.error("Error devuelto por Resend API: %s", detalle)
        raise RuntimeError("No se pudo enviar el correo a través de Resend.")


async def enviar_correo_verificacion(destinatario: str, nombre: str | None, enlace: str) -> None:
    # validamos que la llave de brevo este presente en el entorno
    if not settings.brevo_api_key:
        logger.error(
            "BREVO_API_KEY no está configurada: no se puede enviar el correo de verificación."
        )
        raise RuntimeError("BREVO_API_KEY no está configurada en el servidor.")

    cuerpo = {
        "sender": {
            "name": settings.brevo_sender_name,
            "email": settings.brevo_sender_email,
        },
        "to": [
            {
                "email": destinatario,
                "name": nombre or "Cliente",
            }
        ],
        "subject": ASUNTO_VERIFICACION,
        "htmlContent": construir_html_verificacion(nombre, enlace),
    }
    cabeceras = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": settings.brevo_api_key,
    }

    async with httpx.AsyncClient(timeout=15) as cliente:
        respuesta = await cliente.post(BREVO_URL, headers=cabeceras, json=cuerpo)

    if respuesta.status_code >= 400:
        try:
            detalle = respuesta.json()
        except ValueError:
            detalle = respuesta.text
        logger.error("Error devuelto por Brevo API: %s", detalle)
        raise RuntimeError("No se pudo enviar el correo de verificación a través de Brevo.")