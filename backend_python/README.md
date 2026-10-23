# Backend Urban Clothes — FastAPI

Migración del backend original de **Node.js + Express** a **Python 3 + FastAPI**, manteniendo
los mismos endpoints, la misma lógica de negocio, los mismos mensajes de error y el mismo
contrato JSON que consume el frontend React. La carpeta [`../backend`](../backend) se conserva
como referencia del backend anterior.

## Requisitos

- Python **3.10 o superior** (probado con 3.12.10; las dependencias también tienen wheels para 3.14).
- Acceso a la base de datos PostgreSQL de Supabase (las mismas variables del backend Node).
- Opcional: una API key de [Resend](https://resend.com) para el correo de recuperación.

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

El script:

1. Elige un Python 3.10+ disponible (prefiere 3.12) y crea `backend_python/.venv`.
2. Instala `requirements.txt` en ese entorno aislado.
3. Copia `../backend/.env` a `backend_python/.env` si aún no existe (o `.env.example` si no hay).
4. Arranca Uvicorn en `http://localhost:3000` con recarga automática.

Documentación interactiva de la API: `http://localhost:3000/docs`.

> El puerto 3000 mantiene compatibilidad con el proxy `/api` de `vite.config.js` y con el
> `PORT` que asigna Render, así que el frontend no necesita cambios.

### Instalación manual

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item ..\backend\.env .env
python -m uvicorn main:app --host 0.0.0.0 --port 3000 --reload
```

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../backend/.env .env
uvicorn main:app --host 0.0.0.0 --port 3000 --reload
```

También se puede arrancar sin Uvicorn CLI: `python main.py`.

## Variables de entorno (`.env`)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `PORT` | no | Puerto HTTP. Por defecto `3000`. |
| `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` | sí | Conexión PostgreSQL/Supabase. |
| `DB_SSL` | no | `true` por defecto (Supabase). `false` solo para Postgres local sin TLS. |
| `JWT_SECRET` | sí | Firma de los JWT. Sin ella el servidor **no arranca**. |
| `RESEND_API_KEY` | para correo | API key de Resend. Sin ella, `/api/usuarios/recuperar-contrasena` responde 500. |
| `RESEND_FROM` | no | Remitente del correo (`Nombre <correo@dominio>`). Por defecto `Americanoshh Support <onboarding@resend.dev>`. |
| `FRONTEND_URL` | no | Origen del frontend para el enlace de recuperación. Por defecto `https://americanos-hh.netlify.app`. |
| `ENTORNO` | no | `development` / `production`, informativo. |

> El `.env` heredado del backend Node **no incluye** `RESEND_API_KEY`: añádela para que la
> recuperación de contraseña funcione. Las variables `EMAIL_USER`, `EMAIL_PASS` y
> `FRONTEND_URL` pertenecen a la versión anterior y no se usan.

## Estructura

```text
backend_python/
├── main.py                    # App FastAPI: CORS, manejadores de error, routers, lifespan
├── app/
│   ├── config.py              # Lectura de .env y settings
│   ├── database.py            # Pool asyncpg (compatible con el pooler de Supabase)
│   ├── security.py            # bcrypt, JWT y dependencias de autenticación/rol
│   ├── serialization.py       # Filas PostgreSQL → JSON con el formato de node-pg
│   ├── schemas.py             # Modelos Pydantic de entrada
│   ├── utils.py               # Helpers compartidos
│   ├── routers/
│   │   ├── usuarios.py        # Registro, login, recuperación, perfil, borrado
│   │   └── productos.py       # Catálogo y CRUD de productos
│   └── services/correo.py     # Envío del correo vía API HTTP de Resend
├── requirements.txt
├── setup.sh                   # Instalación + arranque (Linux/macOS/Git Bash)
├── setup.ps1                  # Instalación + arranque (Windows PowerShell)
├── .env.example
└── README.md
```

## Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/usuarios/registro` | — | Crea un usuario (email único, clave ≥ 8, teléfono numérico). |
| `POST` | `/api/usuarios/login` | — | Devuelve JWT (8 h) y datos del usuario. |
| `POST` | `/api/usuarios/recuperar-contrasena` | — | Envía el correo con token temporal (1 h) vía Resend. |
| `POST` | `/api/usuarios/restablecer-contrasena` | — | Cambia la contraseña usando el token del correo. |
| `GET` | `/api/usuarios/perfil` | JWT | Perfil del usuario autenticado. |
| `PUT` | `/api/usuarios/perfil` | JWT | Actualiza teléfono/dirección y, opcionalmente, la contraseña. |
| `DELETE` | `/api/usuarios/{id}` | JWT | El propio usuario o un administrador. |
| `GET` | `/api/productos` | — | Catálogo activo; admite `?categoria=hombre\|mujer\|unisex`. |
| `GET` | `/api/productos/{id}` | — | Detalle de un producto. |
| `POST` | `/api/productos` | Admin | Crea un producto. |
| `PUT` | `/api/productos/{id}` | Admin | Actualización parcial (los campos omitidos se conservan). |
| `DELETE` | `/api/productos/{id}` | Admin | Elimina un producto. |

Los errores siempre conservan el formato `{"error": "mensaje"}` que lee `src/services/api.js`.
Los estados y mensajes originales se mantuvieron (incluido el 500 para IDs no numéricos, tal
como hacía PostgreSQL a través de `pg`).

## Compatibilidad con el backend Node

- **Contraseñas:** los hashes bcrypt `$2b$10$...` creados por Node se validan sin cambios; los
  nuevos también son compatibles con bcrypt de Node.
- **JWT:** mismo algoritmo (`HS256`), mismo secreto y mismos claims (`id`, `email`, `rol`,
  `iat`, `exp`). Los tokens emitidos por un backend valen en el otro.
- **Respuestas:** `precio` se devuelve como texto (`"60000.00"`, como node-pg) y las fechas en
  ISO 8601 UTC con `Z`, para no alterar lo que ya consumía el frontend.
- **CORS:** cualquier origen, métodos `GET/POST/PUT/DELETE/OPTIONS` y cabeceras
  `Content-Type`/`Authorization`.
- **Supabase/pgbouncer:** el pool usa `statement_cache_size=0`; el pooler en *transaction mode*
  no admite prepared statements con nombre (Node no los usaba). Sin esto, las consultas
  repetidas fallan con `DuplicatePreparedStatementError`.

## Despliegue en Render

El repositorio incluye [`../render.yaml`](../render.yaml), un blueprint que crea el servicio
`urban-clothes-api` con `rootDir: backend_python` y estas órdenes:

- Build command: `pip install --upgrade pip && pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health check: `GET /api/salud`
- Python: `3.12.10` (variable `PYTHON_VERSION`)

Pasos:

1. Render Dashboard → **New → Blueprint** → elige este repositorio.
2. Completa los valores `sync: false`: `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `JWT_SECRET` y
   `RESEND_API_KEY` (cópialos de `backend_python/.env`). `DB_NAME` ya viene como `postgres`.
3. Deploy. La URL queda como `https://urban-clothes-api.onrender.com`.
4. Si el nombre ya está ocupado, Render pedirá otro: actualiza entonces el host en
   `netlify.toml` (o define `VITE_API_URL` en Netlify) y `FRONTEND_URL` en Render.

Notas de producción:

- El plan gratuito de Render suspende el servicio por inactividad; la primera petición
  puede tardar ~50 s. El frontend mostrará el error de conexión hasta que despierte.
- `DB_PORT=6543` corresponde al pooler en modo transacción de Supabase (el que ya usa
  `backend_python/.env`). Con el host directo, usa `5432`.
- `onboarding@resend.dev` de Resend solo entrega al correo del dueño de la cuenta. Para
  enviar a cualquier usuario hay que verificar un dominio en Resend y poner ese remitente
  en `RESEND_FROM`.
- `netlify.toml` redirige `/api/*` a este servicio; el frontend no necesita configuración
  adicional si se conserva la URL del blueprint.

## Verificación realizada

Se ejecutó la API de punta a punta contra la base de datos real dentro de una transacción
revertida (sin persistir datos): registro, duplicados y validaciones, login, cambio y
restablecimiento de contraseña, perfil, borrado de cuentas con permisos, CRUD de productos con
rol administrador, filtros del catálogo, CORS y arranque fallido sin `JWT_SECRET`.
