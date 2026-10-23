"""Modelos de entrada de la API.

Los campos son opcionales a propósito: la validación (y los mensajes de error)
se hace en cada ruta, exactamente igual que en el backend Express.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class ModeloPeticion(BaseModel):
    model_config = ConfigDict(extra="ignore")


class RegistroUsuarioRequest(ModeloPeticion):
    nombre: str | None = None
    email: str | None = None
    contrasena: str | None = None
    telefono: str | None = None
    direccion: str | None = None


class LoginRequest(ModeloPeticion):
    email: str | None = None
    contrasena: str | None = None


class RecuperarContrasenaRequest(ModeloPeticion):
    email: str | None = None


class RestablecerContrasenaRequest(ModeloPeticion):
    token: str | None = None
    nuevaContrasena: str | None = None


class ActualizarPerfilRequest(ModeloPeticion):
    contrasenaActual: str | None = None
    nuevaContrasena: str | None = None
    telefono: str | None = None
    direccion: str | None = None


class CrearProductoRequest(ModeloPeticion):
    titulo: str | None = None
    descripcion: str | None = None
    precio: float | None = None
    imagen_url: str | None = None
    categoria: str | None = None
    tallas: list[str] | None = None


class ActualizarProductoRequest(ModeloPeticion):
    titulo: str | None = None
    descripcion: str | None = None
    precio: float | None = None
    imagen_url: str | None = None
    categoria: str | None = None
    tallas: list[str] | None = None
    estado: str | None = None
