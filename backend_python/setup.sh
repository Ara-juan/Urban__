#!/usr/bin/env bash
# instalacion limpia y arranque del backend fastapi de urban clothes
# para correr esto usas ./setup.sh en linux macos o git bash de windows

# aca le decimos al script que si algo llega a fallar se detenga de una vez
set -euo pipefail

# nos aseguramos de estar parados en la misma carpeta donde vive este archivo
cd "$(dirname "${BASH_SOURCE[0]}")"

PYTHON=()
# buscamos cual es la mejor version de python que tienen instalada empezando por la mas nueva
for version in 3.12 3.11 3.13 3.10; do
  if command -v "python$version" >/dev/null 2>&1 \
    && "python$version" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; then
    PYTHON=("python$version")
    break
  fi
  # por si lo estan corriendo en windows usando git bash a veces toca con el lanzador py
  if command -v py >/dev/null 2>&1 \
    && py "-$version" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; then
    PYTHON=(py "-$version")
    break
  fi
done

# si no le dimos a ninguna version exacta probamos con los comandos generales
if [ ${#PYTHON[@]} -eq 0 ]; then
  for candidato in python3 python; do
    if command -v "$candidato" >/dev/null 2>&1 \
      && "$candidato" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; then
      PYTHON=("$candidato")
      break
    fi
  done
fi

# si definitivamente no hay python o es muy viejo sacamos el error y apagamos todo
if [ ${#PYTHON[@]} -eq 0 ]; then
  echo "ERROR: se requiere Python 3.10 o superior (se recomienda 3.12)."
  exit 1
fi

# le avisamos a la persona que version agarramos al final
echo "==> Usando $("${PYTHON[@]}" --version)"

# 1 entorno virtual aislado
# revisamos si la carpeta del entorno existe y si no la creamos limpia
if [ ! -d .venv ]; then
  echo "==> Creando entorno virtual en backend_python/.venv"
  "${PYTHON[@]}" -m venv .venv
fi

# dependiendo de si estan en windows o en linux toca activar el entorno en carpetas distintas
if [ -f .venv/Scripts/activate ]; then
  # shellcheck disable=SC1091
  source .venv/Scripts/activate
else
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

# 2 dependencias
echo "==> Instalando dependencias"
# actualizamos pip para no sufrir con librerias desactualizadas y bajamos todo lo del proyecto
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# 3 variables de entorno
if [ ! -f .env ]; then
  # si el proyecto de node ya tenia configuracion intentamos reciclarla
  if [ -f ../backend/.env ]; then
    cp ../backend/.env .env
    echo "==> Se copió ../backend/.env a backend_python/.env"
    echo "    Añade RESEND_API_KEY si quieres habilitar la recuperación por correo."
  else
    # si de plano no hay nada copiamos el archivo de ejemplo y frenamos el script para que lo llenen
    cp .env.example .env
    echo "ERROR: no existe backend_python/.env. Se creó desde .env.example."
    echo "       Edita DB_*, JWT_SECRET y RESEND_API_KEY y vuelve a ejecutar ./setup.sh"
    exit 1
  fi
fi

# 4 servidor
# sacamos el puerto de la configuracion o le ponemos el 3000 si viene vacio
PUERTO="${PORT:-3000}"
echo "==> Servidor FastAPI en http://localhost:${PUERTO}"
echo "    Documentación interactiva: http://localhost:${PUERTO}/docs"
# arrancamos el servidor en modo desarrollo para que los cambios se recarguen solos
exec python -m uvicorn main:app --host 0.0.0.0 --port "$PUERTO" --reload