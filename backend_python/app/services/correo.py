"""Envío del correo de recuperación mediante la API HTTP de Resend."""

from __future__ import annotations

import logging

import httpx

from app.config import settings

logger = logging.getLogger("urban.correo")

RESEND_URL = "https://api.resend.com/emails"
ASUNTO = "Recuperación de Contraseña — Americanoshh"


def construir_enlace_recuperacion(token: str) -> str:
    # FRONTEND_URL permite apuntar el enlace al dominio real de Netlify (o a uno propio).
    return f"{settings.frontend_url}/login?resetToken={token}"


def construir_html_recuperacion(nombre: str | None, enlace: str) -> str:
    # Se mantiene el mismo maquetado inline del backend Node para que se vea
    # igual en Outlook, Gmail y Apple Mail.
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


async def enviar_correo_recuperacion(destinatario: str, nombre: str | None, enlace: str) -> None:
    """Llama a Resend y lanza una excepción si el envío falla (igual que en Node)."""
    if not settings.resend_api_key:
        logger.error(
            "RESEND_API_KEY no está configurada: no se puede enviar el correo de recuperación."
        )
        raise RuntimeError("RESEND_API_KEY no está configurada en el servidor.")

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

    async with httpx.AsyncClient(timeout=15) as cliente:
        respuesta = await cliente.post(RESEND_URL, headers=cabeceras, json=cuerpo)

    if respuesta.status_code >= 400:
        try:
            detalle = respuesta.json()
        except ValueError:
            detalle = respuesta.text
        logger.error("Error devuelto por Resend API: %s", detalle)
        raise RuntimeError("No se pudo enviar el correo a través de Resend.")
