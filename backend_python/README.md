# Backend Urban Clothes — FastAPI

Backend de **Urban Clothes (Americanoshh)** desarrollado en **Python 3 + FastAPI**, migrado desde la implementación original en **Node.js + Express** conservando compatibilidad total con los hashes de contraseñas, estructura de tokens JWT y contrato JSON del frontend React.

## Requisitos

- **Python 3.10 o superior** (probado en `3.12.10`).
- Base de datos **PostgreSQL en Supabase** (pooler en modo transacción puerto `6543` o directo `5432`).
- API key de **Brevo** (con remitente verificado) para el envío de correos de verificación de cuenta.
- API key de **Resend** para el envío de correos de recuperación de contraseña.

## Inicio rápido

**Windows (PowerShell):**

```powershell
cd backend_python
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

**Linux / macOS / Git Bash:**

```bash
cd backend_python
chmod +x setup.sh
./setup.sh
```

El script automatizado:

1. Detecta una versión de Python 3.10+ disponible (priorizando 3.12) y crea el entorno virtual `backend_python/.venv`.
2. Instala las dependencias listadas en `requirements.txt`.
3. Crea `backend_python/.env` a partir de `.env.example` si aún no existe.
4. Inicia Uvicorn en `http://localhost:3000` con recarga automática (`--reload`).

Documentación interactiva de la API (Swagger UI): `http://localhost:3000/docs`.

> El puerto `3000` coincide con el proxy `/api` configurado en `vite.config.js` y con el puerto asignado dinámicamente por Render (`$PORT`).

### Instalación manual

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn main:app --host 0.0.0.0 --port 3000 --reload
```

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --host 0.0.0.0 --port 3000 --reload
```

También puede ejecutarse directamente mediante `python main.py`.

## Variables de entorno (`.env`)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `PORT` | No | Puerto HTTP del servidor. Por defecto `3000`. |
| `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` | Sí | Credenciales de conexión a PostgreSQL / Supabase. |
| `DB_SSL` | No | `true` por defecto (requerido por Supabase). Usar `false` solo en PostgreSQL local sin TLS. |
| `JWT_SECRET` | Sí | Clave secreta para firmar y verificar tokens JWT. Sin ella el servidor **no arranca**. |
| `BREVO_API_KEY` | Para verificación | API key (`xkeysib-...`) de Brevo para enviar enlaces de activación en registros nuevos. |
| `BREVO_SENDER_EMAIL` | No | Correo remitente verificado en Brevo. Por defecto `dcuentapro@gmail.com`. |
| `BREVO_SENDER_NAME` | No | Nombre visible del remitente en Brevo. Por defecto `Americanoshh`. |
| `RESEND_API_KEY` | Para recuperación | API key (`re_...`) de Resend para enviar enlaces de restablecimiento de contraseña. |
| `RESEND_FROM` | No | Remitente de Resend (`Nombre <correo@dominio>`). Por defecto `Americanoshh Support <onboarding@resend.dev>`. |
| `FRONTEND_URL` | No | URL base del frontend para construir los enlaces de verificación y recuperación. Por defecto `https://americanos-hh.netlify.app`. |
| `ENTORNO` | No | `development` o `production` (informativo). |
| `ADMIN_EMAIL` | No | Correo de la cuenta administradora predefinida e inmutable. Por defecto `juan.aragom27@gmail.com`. |
| `ADMIN_PASSWORD` | Recomendada | Contraseña inicial de la cuenta administradora creada/verificada al arrancar la app. |
| `ADMIN_NOMBRE` | No | Nombre de perfil de la cuenta administradora. Por defecto `Administrador Americanoshh`. |

## Estructura

```text
backend_python/
├── app/
│   ├── routers/
│   │   ├── productos.py       # Catálogo público y CRUD de productos (rol Admin)
│   │   └── usuarios.py        # Registro, verificación email, login, perfil, favoritos y gestión admin
│   ├── services/
│   │   └── correo.py          # Envío HTTP asíncrono (httpx) con Brevo API y Resend API
│   ├── config.py              # Carga y validación de variables de entorno (.env)
│   ├── database.py            # Pool asyncpg configurado para Supabase Pooler
│   ├── schemas.py             # Modelos Pydantic de entrada
│   ├── security.py            # Hash bcrypt, tokens JWT y dependencias de autorización
│   ├── serialization.py       # Conversión de registros PostgreSQL a formato JSON estándar
│   └── utils.py               # Funciones auxiliares (parseo seguro de enteros, etc.)
├── main.py                    # Instancia FastAPI, CORS, manejadores de error, lifespan y /api/salud
├── requirements.txt           # Dependencias de Python
├── setup.sh                   # Script de instalación y arranque (Linux/macOS/Git Bash)
├── setup.ps1                  # Script de instalación y arranque (Windows PowerShell)
├── .env.example               # Plantilla de configuración de entorno
└── README.md
```

## Endpoints

### Sistema y Salud
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/salud` | — | Verifica que el servidor y la base de datos respondan correctamente (usado por Render). |

### Usuarios, Autenticación y Favoritos
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/usuarios/registro` | — | Registra un cliente (`email_verificado = FALSE`, `acepto_politica = TRUE`) dentro de una transacción y envía el enlace de verificación vía **Brevo**. |
| `POST` | `/api/usuarios/verificar-email` | — | Valida el `verifyToken` recibido por correo y actualiza `email_verificado = TRUE` en PostgreSQL. |
| `POST` | `/api/usuarios/reenviar-verificacion` | — | Reenvía un nuevo enlace de confirmación vía **Brevo** si la cuenta aún no está verificada. |
| `POST` | `/api/usuarios/login` | — | Valida credenciales, bloquea cuentas no verificadas o suspendidas y devuelve JWT (8 h) + datos del usuario. |
| `POST` | `/api/usuarios/recuperar-contrasena` | — | Genera un token temporal (1 h) y envía el correo de restablecimiento vía **Resend**. |
| `POST` | `/api/usuarios/restablecer-contrasena` | — | Actualiza la contraseña utilizando el `resetToken` recibido por correo. |
| `GET` | `/api/usuarios/perfil` | JWT | Devuelve los datos del usuario autenticado (incluyendo estado legal y de verificación). |
| `PUT` | `/api/usuarios/perfil` | JWT | Actualiza teléfono, dirección y/o contraseña del usuario autenticado. |
| `GET` | `/api/usuarios/favoritos` | JWT | Lista las prendas activas guardadas en favoritos por el usuario. |
| `POST` | `/api/usuarios/favoritos/{id_producto}` | JWT | Agrega una prenda activa a la lista de favoritos del usuario. |
| `DELETE` | `/api/usuarios/favoritos/{id_producto}` | JWT | Elimina una prenda de la lista de favoritos del usuario. |
| `GET` | `/api/usuarios` | Admin | Lista todos los usuarios con su estado de verificación, consentimiento legal y bloqueo. |
| `PUT` | `/api/usuarios/{id}/bloqueo` | Admin | Bloquea o desbloquea una cuenta de cliente registrando motivo y fecha. |
| `DELETE` | `/api/usuarios/{id}` | JWT | Elimina una cuenta (permitido al propio dueño o a un administrador; la cuenta admin principal está protegida). |

### Catálogo y Productos
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/productos` | — | Devuelve el catálogo activo; admite filtro opcional `?categoria=hombre\|mujer\|unisex`. |
| `GET` | `/api/productos/{id}` | — | Devuelve el detalle de un producto por su identificador. |
| `POST` | `/api/productos` | Admin | Crea un nuevo producto en el catálogo. |
| `PUT` | `/api/productos/{id}` | Admin | Actualización parcial de un producto (los campos omitidos conservan su valor). |
| `DELETE` | `/api/productos/{id}` | Admin | Elimina un producto del catálogo. |

Todos los errores de negocio mantienen el formato uniforme `{"error": "mensaje"}` consumido por `src/services/api.js`.

## Compatibilidad y Arquitectura Técnica

- **Contraseñas:** Los hashes `bcrypt` (`$2b$10$...`) generados previamente en Node.js se validan sin modificaciones.
- **JWT:** Algoritmo `HS256` con claims `id`, `email`, `rol`, `iat` y `exp` (y claim `proposito: "verificar_email"` en los tokens de activación de cuenta).
- **Serialización:** Los precios se serializan en formato decimal de texto (`"60000.00"`) y las fechas en formato ISO 8601 UTC (`Z`).
- **CORS:** Habilitado para permitir peticiones desde el frontend en Netlify y entornos locales (`GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`).
- **Supabase / PgBouncer:** El pool `asyncpg` opera con `statement_cache_size=0` para evitar errores `DuplicatePreparedStatementError` al usar el pooler de Supabase en *transaction mode* (puerto `6543`).

## Despliegue en Render

El repositorio incluye [`../render.yaml`](../render.yaml) con la configuración de despliegue (`rootDir: backend_python`):

- **Build command:** `pip install --upgrade pip && pip install -r requirements.txt`
- **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Health check:** `GET /api/salud`
- **Python:** `3.12.10` (`PYTHON_VERSION`)

### Notas de producción

- El plan gratuito de Render suspende la instancia tras un periodo de inactividad; la primera petición tras reposo puede tardar ~50 segundos mientras despierta el contenedor.
- **Arquitectura dual de correos:**
  - **Brevo** envía los correos de verificación de cuenta desde `dcuentapro@gmail.com` a cualquier dirección real (`Gmail`, `Outlook`, `Hotmail`, etc.) sin requerir dominio propio.
  - **Resend** gestiona los correos de recuperación de contraseña (en modo sandbox con `onboarding@resend.dev` entrega al correo propietario de la cuenta Resend; para entregas abiertas a terceros en Resend se requiere verificar un dominio propio en `RESEND_FROM`).
- En `netlify.toml` se redirigen las llamadas `/api/*` hacia la URL del servicio desplegado en Render (`https://urban-backend-7syc.onrender.com/api/:splat`).