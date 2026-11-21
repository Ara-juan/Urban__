# Proyecto "Urban Clothes" — Americanoshh

Aplicación web full-stack para el catálogo y comercio bajo demanda (*Print-on-Demand*) de la marca de streetwear **Americanoshh**. El proyecto fue migrado desde una arquitectura inicial en HTML/CSS/JS y Node.js/Express hacia un frontend moderno en **React 19 + Vite 7** y un backend asíncrono en **Python 3 + FastAPI**, conectado a **PostgreSQL en Supabase**.

> Repositorio de referencia / respaldo de versiones anteriores:  
> https://github.com/Ara-juan/versi-n-react.git

---

## Funcionalidades Principales

- **Catálogo Dinámico y Colecciones:** Filtrado por categorías (`Hombre`, `Mujer`, `Unisex`), carrusel destacado, vista detallada de prendas con selección de tallas y flujo de compra directa vía **WhatsApp** (con autocompletado de datos de envío para usuarios registrados).
- **Autenticación con Verificación Real de Correo (*Double Opt-In*):**
  - Al registrarse, la cuenta se crea con `email_verificado = FALSE` y se envía un enlace de activación mediante la API de **Brevo**, evitando registros con correos falsos o inexistentes.
  - Incluye opción de reenvío de enlace de verificación y flujo de **recuperación de contraseña** con tokens temporales vía **Resend**.
- **Lista de Favoritos (*"Guardar para quincena"*):** Permite a los clientes autenticados guardar y gestionar prendas de interés directamente en la base de datos.
- **Panel de Administración (`ADMINISTRADOR`):**
  - Gestión completa (CRUD) de productos con carga de imágenes al bucket `Imagenes` de **Supabase Storage**.
  - Gestión de usuarios registrados con visualización de estado de verificación, aceptación legal y control de **bloqueo/desbloqueo de cuentas** con motivo registrado.
- **Cumplimiento Normativo Colombiano:** Consentimiento previo, expreso e informado obligatorio en el registro (`acepto_politica` y `fecha_aceptacion_politica`) y centro legal integrado conforme a la **Ley 1581 de 2012** (Protección de Datos Personales), **Decreto 1377 de 2013**, **Ley 1480 de 2011** (Estatuto del Consumidor), **Ley 527 de 1999**, **Ley 23 de 1982** y **Ley 1273 de 2009**.

---

## Tecnologías y Herramientas

- **Frontend:** React 19, Vite 7, React Router 7, Bootstrap y CSS modular.
- **Backend:** Python 3.12, FastAPI, Uvicorn y Pydantic v2 (migrado desde Node.js/Express).
- **Base de Datos y Almacenamiento:** Supabase (PostgreSQL en la nube con pool asíncrono `asyncpg` y Supabase Storage en el bucket `Imagenes`).
- **Seguridad:** Hashing de contraseñas con `bcrypt` y autenticación mediante tokens `JWT (HS256)`.
- **Correos Transaccionales:**
  - **Brevo API:** Envío de enlaces de verificación de correo electrónico en registros nuevos.
  - **Resend API:** Envío de enlaces de restablecimiento de contraseña.
- **Despliegue y Versionamiento:** Netlify (frontend), Render (backend) y Git / GitHub.

---

## Estructura del Proyecto

```text
Urban/
├── backend_python/                   # Backend actual: Python 3 + FastAPI
│   ├── app/
│   │   ├── routers/
│   │   │   ├── productos.py          # Catálogo público y CRUD admin de prendas
│   │   │   └── usuarios.py           # Registro, verificación email, login, perfil, favoritos y admin
│   │   ├── services/
│   │   │   └── correo.py             # Integración HTTP con Brevo (verificación) y Resend (clave)
│   │   ├── config.py                 # Lectura centralizada de variables de entorno (.env)
│   │   ├── database.py               # Pool de conexiones asyncpg compatible con Supabase
│   │   ├── schemas.py                # Modelos Pydantic de validación de peticiones
│   │   ├── security.py               # bcrypt, generación/validación de JWT y control de roles
│   │   ├── serialization.py          # Serialización de filas PostgreSQL a JSON
│   │   └── utils.py                  # Utilidades compartidas
│   ├── main.py                       # Punto de entrada FastAPI (CORS, lifespan, health check)
│   ├── requirements.txt              # Dependencias de Python
│   ├── setup.ps1 / setup.sh          # Scripts automatizados de instalación y arranque local
│   ├── .env.example                  # Plantilla de variables de entorno del backend
│   └── README.md                     # Documentación técnica detallada del backend
│
├── public/                           # Recursos estáticos (logo y fondos)
├── src/                              # Código fuente del Frontend React
│   ├── components/                   # Componentes reutilizables
│   │   ├── AlertaMensaje.jsx         # Notificaciones de estado y error en formularios
│   │   ├── AvisoPrivacidad.jsx/.css  # Centro legal modal (Datos, Términos POD, Propiedad Intelectual)
│   │   ├── CarruselProductos.jsx/.css# Carrusel principal de prendas destacadas
│   │   ├── FooterLegal.jsx/.css      # Pie de página con accesos directos a políticas legales
│   │   ├── GridCatalogo.css          # Estilos de cuadrícula del catálogo
│   │   ├── ListaProductos.jsx        # Renderizado de listados filtrados
│   │   ├── ModalProducto.jsx/.css    # Vista rápida de prenda, tallas y pedido por WhatsApp
│   │   ├── Navbar.jsx/.css           # Barra de navegación responsive y estado de sesión
│   │   └── ProductoCard.jsx/.css     # Tarjeta individual de producto y botón de favoritos
│   ├── context/
│   │   ├── AuthContext.jsx           # Estado global de sesión, token y rol de usuario
│   │   └── FiltrosContext.jsx        # Estado global de búsqueda y filtros de colección
│   ├── hooks/
│   │   └── useProductos.js           # Hook personalizado para consulta y caché de catálogo
│   ├── pages/
│   │   ├── Inicio.jsx/.css           # Página principal (Landing)
│   │   ├── Catalogo.jsx              # Vista general de todo el catálogo
│   │   ├── Categoria.jsx             # Vista filtrada por categoría
│   │   ├── Colecciones.jsx/.css      # Colecciones (Hombre, Mujer, Unisex)
│   │   ├── AcercaDe.jsx/.css         # Información de la marca Americanoshh y modelo POD
│   │   ├── Login.jsx/.css            # Login, registro, verificación de correo y recuperación de clave
│   │   ├── Perfil.jsx/.css           # Gestión de perfil, envío express y lista de favoritos
│   │   └── AdminProductos.jsx/.css   # Panel administrador (productos, imágenes y usuarios)
│   ├── services/
│   │   ├── api.js                    # Cliente HTTP centralizado hacia la API FastAPI
│   │   └── supabase.js               # Cliente de Supabase para subida de imágenes al bucket
│   ├── App.jsx                       # Definición de rutas con React Router 7
│   ├── main.jsx                      # Punto de entrada React (Providers y Bootstrap)
│   └── index.css                     # Estilos globales
│
├── .env.example                      # Plantilla de variables de entorno del frontend
├── index.html                        # Plantilla HTML raíz
├── netlify.toml                      # Configuración de build y proxy /api/* en Netlify
├── package.json                      # Dependencias y scripts de Vite/React
├── render.yaml                       # Blueprint de despliegue del backend en Render
└── vite.config.js                    # Configuración de Vite y proxy local hacia :3000
```

---

## Ejecución en Local

1. **Levantar el Backend (`backend_python`):**
   ```powershell
   cd backend_python
   powershell -ExecutionPolicy Bypass -File .\setup.ps1
   ```
   *(Disponible en `http://localhost:3000` y documentación Swagger en `http://localhost:3000/docs`).*

2. **Levantar el Frontend (en otra terminal desde la raíz):**
   ```bash
   npm install
   npm run dev
   ```