"""rutas del catalogo de productos"""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any

import asyncpg
from fastapi import APIRouter, Depends

from app.database import obtener_conexion
from app.schemas import ActualizarProductoRequest, CrearProductoRequest
from app.security import ApiError, administrador_requerido
from app.serialization import fila_a_dict, filas_a_lista
from app.utils import parsear_entero

# configuramos el log para rastrear errores internos
logger = logging.getLogger("urban.productos")

# creamos el enrutador principal para los productos
router = APIRouter(prefix="/api/productos", tags=["productos"])

# definimos constantes arriba para no repetir esto en el codigo despues
TALLAS_POR_DEFECTO = ["XS", "S", "M", "L", "XL"]
ESTADOS_VALIDOS = ("activo", "inactivo")


@router.get("")
async def listar_productos(
    categoria: str | None = None,
    conexion: asyncpg.Connection = Depends(obtener_conexion),
) -> list[dict[str, Any]]:
    # traemos todos los productos de la base de datos que esten activos
    try:
        consulta = "SELECT * FROM productos WHERE estado = 'activo'"
        parametros: list[Any] = []

        # si nos envian una categoria armamos el filtro de busqueda
        if categoria:
            parametros.append(categoria)
            consulta += f" AND categoria = ${len(parametros)}"

        # ordenamos todo para que los productos mas nuevos salgan de primero
        consulta += " ORDER BY id_producto DESC"

        filas = await conexion.fetch(consulta, *parametros)
        return filas_a_lista(filas)
    except Exception as error:  # noqa: BLE001
        # si algo explota lo guardamos en el log y lanzamos un error de servidor
        logger.exception("Error al consultar productos: %s", error)
        raise ApiError(500, "Error al consultar el catálogo de productos.") from error


@router.get("/{id}")
async def obtener_producto(
    id: str,
    conexion: asyncpg.Connection = Depends(obtener_conexion),
) -> dict[str, Any]:
    # buscamos la informacion detallada de un solo producto usando su id
    try:
        # primero revisamos que el id ingresado si sea un numero valido
        id_producto = parsear_entero(id)
        if id_producto is None:
            raise ValueError(f"Identificador de producto inválido: {id}")

        fila = await conexion.fetchrow(
            "SELECT * FROM productos WHERE id_producto = $1", id_producto
        )

        # si la base de datos no devuelve nada entonces no existe el producto
        if fila is None:
            raise ApiError(404, "Producto no encontrado.")

        return fila_a_dict(fila)
    except ApiError:
        raise
    except Exception as error:  # noqa: BLE001
        logger.exception("Error al obtener producto: %s", error)
        raise ApiError(
            500, "Error al obtener la información del producto."
        ) from error


@router.post("", status_code=201)
async def crear_producto(
    datos: CrearProductoRequest,
    _administrador: dict[str, Any] = Depends(administrador_requerido),
    conexion: asyncpg.Connection = Depends(obtener_conexion),
) -> dict[str, Any]:
    # aca creamos un producto nuevo pero exigimos que quien lo haga sea un administrador
    # revisamos que no nos dejen campos vacios que son obligatorios
    if not datos.titulo or not datos.precio or not datos.imagen_url or not datos.categoria:
        raise ApiError(
            400, "Título, precio, URL de imagen y categoría son obligatorios."
        )

    try:
        # metemos el nuevo producto y por defecto siempre arranca en estado activo
        fila = await conexion.fetchrow(
            """
            INSERT INTO productos (titulo, descripcion, precio, imagen_url, categoria, tallas, estado)
            VALUES ($1, $2, $3, $4, $5, $6, 'activo')
            RETURNING *
            """,
            datos.titulo,
            datos.descripcion or None,
            Decimal(str(datos.precio)),
            datos.imagen_url,
            datos.categoria,
            # si en la peticion no mandan las tallas usamos las que definimos arriba por defecto
            datos.tallas if datos.tallas is not None else TALLAS_POR_DEFECTO,
        )
    except Exception as error:  # noqa: BLE001
        logger.exception("Error al registrar producto: %s", error)
        raise ApiError(500, "Error interno al guardar el producto.") from error

    return {
        "mensaje": "Producto creado exitosamente.",
        "producto": fila_a_dict(fila),
    }


@router.put("/{id}")
async def actualizar_producto(
    id: str,
    datos: ActualizarProductoRequest,
    _administrador: dict[str, Any] = Depends(administrador_requerido),
    conexion: asyncpg.Connection = Depends(obtener_conexion),
) -> dict[str, Any]:
    # sirve para modificar partes de un producto existente pidiendo permisos de admin
    # evitamos que le pongan un estado inventado al producto
    if datos.estado and datos.estado not in ESTADOS_VALIDOS:
        raise ApiError(400, "El estado debe ser 'activo' o 'inactivo'.")

    try:
        id_producto = parsear_entero(id)
        if id_producto is None:
            raise ValueError(f"Identificador de producto inválido: {id}")

        precio = Decimal(str(datos.precio)) if datos.precio is not None else None

        # usamos coalesce para reemplazar unicamente los datos que nos enviaron
        # de esta forma lo que venga vacio se queda igual que como estaba antes
        fila = await conexion.fetchrow(
            """
            UPDATE productos
            SET titulo = COALESCE($1, titulo),
                descripcion = COALESCE($2, descripcion),
                precio = COALESCE($3, precio),
                imagen_url = COALESCE($4, imagen_url),
                categoria = COALESCE($5, categoria),
                tallas = COALESCE($6, tallas),
                estado = COALESCE($7, estado)
            WHERE id_producto = $8
            RETURNING *
            """,
            datos.titulo,
            datos.descripcion,
            precio,
            datos.imagen_url,
            datos.categoria,
            datos.tallas,
            datos.estado,
            id_producto,
        )

        if fila is None:
            raise ApiError(404, "Producto no encontrado para actualizar.")

        return {
            "mensaje": "Producto actualizado correctamente.",
            "producto": fila_a_dict(fila),
        }
    except ApiError:
        raise
    except Exception as error:  # noqa: BLE001
        logger.exception("Error al actualizar producto: %s", error)
        raise ApiError(
            500, "Error al actualizar la información del producto."
        ) from error


@router.delete("/{id}")
async def eliminar_producto(
    id: str,
    _administrador: dict[str, Any] = Depends(administrador_requerido),
    conexion: asyncpg.Connection = Depends(obtener_conexion),
) -> dict[str, str]:
    # esto borra el producto de la base de datos definitivamente
    try:
        id_producto = parsear_entero(id)
        if id_producto is None:
            raise ValueError(f"Identificador de producto inválido: {id}")

        fila = await conexion.fetchrow(
            "DELETE FROM productos WHERE id_producto = $1 RETURNING id_producto",
            id_producto,
        )

        # si al final no se devolvio ninguna fila es porque el producto no existia
        if fila is None:
            raise ApiError(404, "Producto no encontrado para eliminar.")

        return {"mensaje": "Producto eliminado correctamente del sistema."}
    except ApiError:
        raise
    except Exception as error:  # noqa: BLE001
        logger.exception("Error al eliminar producto: %s", error)
        # conservamos el mensaje original de error para que cuadre con el frontend
        raise ApiError(500, "Error al intentar eliminar el usuario.") from error