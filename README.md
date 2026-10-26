# Proyecto "Urban Clothes"

En este repositorio se encuentra la versión del proyecto de urban clothes (pagina web que muestra el catalogo de ropa de la marca americanoshh) en la cual en la parte del backend se uso js-node.js y express, en vez de la actual que es con python y FastAPI


La versión en HTML/CSS/JS sigue activa (por si algo fallaba y no tenia copia de respaldo del código): 
https://github.com/Ara-juan/versi-n-react.git



## Tecnologías/Herramientas

- **React 19** + **Vite 7** (entorno de desarrollo y build)
- **React Router 7** (navegación entre páginas)
- **supabase/PostgreSQL** (subida de imágenes al bucket `Imagenes` desde el panel admin. Con bases de datos PostgreSQL en la nube con el servicio de supabase)
- **Netlify** (para despliegue visual del frontend y que este en internet)
- **Render** (para despliegue del backend)
- **Python 3 + FastAPI + Uvicorn** (backend actual, migrado desde Node.js/Express)
- **asyncpg** (pool asíncrono de PostgreSQL hacia Supabase)
- **Git/Github** (Para versionamiento y guardado del código del proyecto en internet)
- **Resend** (Para envio de correos electronicos de restablecimiento de contraseña de usuarios que esten en la base de datos)


## Estructura del Proyecto

```text
react/
├── backend_python/           # Backend actual: Python + FastAPI
│   ├── main.py               # App FastAPI (CORS, errores, routers)
│   ├── app/                  # Configuración, pool asyncpg, seguridad y rutas
│   ├── requirements.txt      # Dependencias de Python
│   ├── setup.sh / setup.ps1  # Instalación y arranque automatizados
│   └── README.md             # Guía del backend (variables, endpoints, despliegue)
│
│
├── public/                   # Recursos estáticos de la aplicación (fondo y logo)
├── src/                      # Código fuente del Frontend React
│   ├── components/           # Componentes UI reutilizables (Navbar, Footer, Modales, Cards)
│   ├── context/              # Contextos globales de React (AuthContext, FiltrosContext)
│   ├── hooks/                # Hooks personalizados (useProductos, useAuth)
│   ├── pages/                # Vistas principales de la aplicación
│   │   ├── Inicio / Catálogo / Colecciones (Hombre, Mujer, Unisex)
│   │   ├── Login / Registro / Recuperar Contraseña
│   │   ├── Perfil de Usuario
│   │   └── Panel de Administración de Productos (Admin)
│   │
│   ├── services/             # Servicios de integración HTTP
│   │   ├── api.js            # Peticiones fetch hacia la API REST del backend
│   │   └── supabase.js       # Configuración y llamadas a servicios auxiliares
│   │
│   ├── App.jsx               # Configuración de rutas principales (React Router)
│   ├── main.jsx              # Punto de entrada de la app (Providers, Bootstrap, Router)
│   └── index.css             # Estilos globales y personalización CSS
│
├── index.html                # Plantilla HTML raíz de la aplicación React
├── netlify.toml              # Configuración de despliegue y redirecciones en Netlify
├── package.json              # Dependencias del frontend (React, Vite, Router, etc.)
└── vite.config.js            # Configuración del empaquetador Vite y proxy de desarrollo
```
