"""modelos de entrada de la api
los campos son opcionales a proposito porque la validacion y los mensajes de error
se hacen directo en cada ruta exactamente igual que como funcionaba el backend de express"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict

# esta es la clase base para todos los modelos ignoramos cualquier dato extra que manden por si acaso
class ModeloPeticion(BaseModel):
    model_config = ConfigDict(extra="ignore")

# aca definimos los datos que esperamos recibir cuando alguien se quiere registrar
class RegistroUsuarioRequest(ModeloPeticion):
    nombre: str | None = None
    email: str | None = None
    contrasena: str | None = None
    telefono: str | None = None
    direccion: str | None = None

# lo basico que necesitamos para validar que si puedan iniciar sesion
class LoginRequest(ModeloPeticion):
    email: str | None = None
    contrasena: str | None = None

# solo pedimos el correo para buscar a la persona y mandarle el link
class RecuperarContrasenaRequest(ModeloPeticion):
    email: str | None = None

# aca nos tienen que mandar la clave nueva junto con el token que le generamos para saber que si es el
class RestablecerContrasenaRequest(ModeloPeticion):
    token: str | None = None
    nuevaContrasena: str | None = None

# dejamos todo opcional porque a veces solo quieren cambiar una cosita y no todo el perfil
class ActualizarPerfilRequest(ModeloPeticion):
    contrasenaActual: str | None = None
    nuevaContrasena: str | None = None
    telefono: str | None = None
    direccion: str | None = None

# toda la informacion que debe llevar un producto nuevo que vayan a subir a la tienda
class CrearProductoRequest(ModeloPeticion):
    titulo: str | None = None
    descripcion: str | None = None
    precio: float | None = None
    imagen_url: str | None = None
    categoria: str | None = None
    tallas: list[str] | None = None

# es lo mismo que crear pero le agregamos el estado para que el admin pueda ocultar ropa si quiere
class ActualizarProductoRequest(ModeloPeticion):
    titulo: str | None = None
    descripcion: str | None = None
    precio: float | None = None
    imagen_url: str | None = None
    categoria: str | None = None
    tallas: list[str] | None = None
    estado: str | None = None