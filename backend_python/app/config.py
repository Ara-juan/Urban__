"""Configuración central del backend, leída desde variables de entorno/.env."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# El .env vive en la raíz de backend_python/ (igual que en el backend Node).
BASE_DIR = Path(__file__).resolve().parent.parent

# load_dotenv no sobrescribe variables ya definidas en el entorno, igual que dotenv
# en Node: así se puede apuntar a otra base de datos al desplegar sin tocar el .env.
load_dotenv(BASE_DIR / ".env")


def _entero(nombre: str, por_defecto: int) -> int:
    valor = os.getenv(nombre)
    if not valor:
        return por_defecto
    try:
        return int(valor)
    except ValueError:
        return por_defecto


def _booleano(nombre: str, por_defecto: bool) -> bool:
    valor = os.getenv(nombre)
    if valor is None:
        return por_defecto
    return valor.strip().lower() not in {"0", "false", "no", "off", ""}


@dataclass(frozen=True)
class Settings:
    port: int
    db_user: str
    db_password: str
    db_host: str
    db_port: int
    db_name: str
    db_ssl: bool
    jwt_secret: str
    resend_api_key: str
    entorno: str


def cargar_settings() -> Settings:
    return Settings(
        port=_entero("PORT", 3000),
        db_user=os.getenv("DB_USER", ""),
        db_password=os.getenv("DB_PASSWORD", ""),
        db_host=os.getenv("DB_HOST", ""),
        db_port=_entero("DB_PORT", 5432),
        db_name=os.getenv("DB_NAME", ""),
        # El backend Node conectaba siempre con SSL sin verificar el certificado
        # (rejectUnauthorized: false), como exige Supabase.
        db_ssl=_booleano("DB_SSL", True),
        jwt_secret=os.getenv("JWT_SECRET", ""),
        resend_api_key=os.getenv("RESEND_API_KEY", ""),
        entorno=os.getenv("ENTORNO", "development"),
    )


settings = cargar_settings()
