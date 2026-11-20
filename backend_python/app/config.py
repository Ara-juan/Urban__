"""configuracion central del backend que lee las variables de entorno"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# aca definimos donde vive el archivo .env que esta en la raiz del backend
BASE_DIR = Path(__file__).resolve().parent.parent

# cargamos las variables de entorno sin pisar las que ya existan por si desplegamos en otro lado
load_dotenv(BASE_DIR / ".env")


def _entero(nombre: str, por_defecto: int) -> int:
    # esta funcion sirve para sacar numeros de las variables de entorno y si falla pone un valor por defecto
    valor = os.getenv(nombre)
    if not valor:
        return por_defecto
    try:
        return int(valor)
    except ValueError:
        return por_defecto


def _booleano(nombre: str, por_defecto: bool) -> bool:
    # lo mismo de arriba pero para valores verdaderos o falsos comprobando si escribieron falso o cero
    valor = os.getenv(nombre)
    if valor is None:
        return por_defecto
    return valor.strip().lower() not in {"0", "false", "no", "off", ""}


@dataclass(frozen=True)
class Settings:
    # aca definimos la estructura con todas las variables de configuracion que vamos a usar en el proyecto
    port: int
    db_user: str
    db_password: str
    db_host: str
    db_port: int
    db_name: str
    db_ssl: bool
    jwt_secret: str
    resend_api_key: str
    resend_from: str
    brevo_api_key: str
    brevo_sender_email: str
    brevo_sender_name: str
    frontend_url: str
    entorno: str
    admin_email: str
    admin_password: str
    admin_nombre: str


def cargar_settings() -> Settings:
    # aca agrupamos todas las variables y las dejamos listas para usarlas
    return Settings(
        port=_entero("PORT", 3000),
        db_user=os.getenv("DB_USER", ""),
        db_password=os.getenv("DB_PASSWORD", ""),
        db_host=os.getenv("DB_HOST", ""),
        db_port=_entero("DB_PORT", 5432),
        db_name=os.getenv("DB_NAME", ""),
        # por defecto nos conectamos con ssl porque asi lo exige supabase para funcionar
        db_ssl=_booleano("DB_SSL", True),
        jwt_secret=os.getenv("JWT_SECRET", ""),
        resend_api_key=os.getenv("RESEND_API_KEY", "").strip(),
        # este es el correo desde el que salen los mensajes de recuperacion en resend
        resend_from=(
            os.getenv("RESEND_FROM")
            or "Americanoshh Support <onboarding@resend.dev>"
        ).strip(),
        # credenciales de brevo para enviar los correos de verificacion de cuenta a cualquier destinatario
        brevo_api_key=os.getenv("BREVO_API_KEY", "").strip(),
        brevo_sender_email=(
            os.getenv("BREVO_SENDER_EMAIL") or "dcuentapro@gmail.com"
        ).strip(),
        brevo_sender_name=(
            os.getenv("BREVO_SENDER_NAME") or "Americanoshh"
        ).strip(),
        # esta direccion del frontend la usamos para armar los links que van en los correos
        frontend_url=(
            os.getenv("FRONTEND_URL") or "https://americanos-hh.netlify.app"
        ).strip().rstrip("/"),
        entorno=os.getenv("ENTORNO", "development"),
        # credenciales predefinidas de la cuenta administradora
        admin_email=os.getenv("ADMIN_EMAIL", "juan.aragom27@gmail.com").strip().lower(),
        admin_password=os.getenv("ADMIN_PASSWORD", "").strip(),
        admin_nombre=os.getenv("ADMIN_NOMBRE", "Administrador Americanoshh").strip(),
    )


# creamos la configuracion de una vez y la guardamos en esta variable para importarla en otros archivos
settings = cargar_settings()