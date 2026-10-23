#!/usr/bin/env bash
# Instalación limpia y arranque del backend FastAPI de Urban Clothes.
# Uso: ./setup.sh   (Linux / macOS / Git Bash en Windows)
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

PYTHON=()
for version in 3.12 3.11 3.13 3.10; do
  if command -v "python$version" >/dev/null 2>&1 \
    && "python$version" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; then
    PYTHON=("python$version")
    break
  fi
  # En Windows (Git Bash) los Python instalados se lanzan con el lanzador `py`.
  if command -v py >/dev/null 2>&1 \
    && py "-$version" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; then
    PYTHON=(py "-$version")
    break
  fi
done

if [ ${#PYTHON[@]} -eq 0 ]; then
  for candidato in python3 python; do
    if command -v "$candidato" >/dev/null 2>&1 \
      && "$candidato" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; then
      PYTHON=("$candidato")
      break
    fi
  done
fi

if [ ${#PYTHON[@]} -eq 0 ]; then
  echo "ERROR: se requiere Python 3.10 o superior (se recomienda 3.12)."
  exit 1
fi

echo "==> Usando $("${PYTHON[@]}" --version)"

# 1. Entorno virtual aislado
if [ ! -d .venv ]; then
  echo "==> Creando entorno virtual en backend_python/.venv"
  "${PYTHON[@]}" -m venv .venv
fi

# Windows usa Scripts/; Linux y macOS usan bin/.
if [ -f .venv/Scripts/activate ]; then
  # shellcheck disable=SC1091
  source .venv/Scripts/activate
else
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

# 2. Dependencias
echo "==> Instalando dependencias"
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# 3. Variables de entorno
if [ ! -f .env ]; then
  if [ -f ../backend/.env ]; then
    cp ../backend/.env .env
    echo "==> Se copió ../backend/.env a backend_python/.env"
    echo "    Añade RESEND_API_KEY si quieres habilitar la recuperación por correo."
  else
    cp .env.example .env
    echo "ERROR: no existe backend_python/.env. Se creó desde .env.example."
    echo "       Edita DB_*, JWT_SECRET y RESEND_API_KEY y vuelve a ejecutar ./setup.sh"
    exit 1
  fi
fi

# 4. Servidor
PUERTO="${PORT:-3000}"
echo "==> Servidor FastAPI en http://localhost:${PUERTO}"
echo "    Documentación interactiva: http://localhost:${PUERTO}/docs"
exec python -m uvicorn main:app --host 0.0.0.0 --port "$PUERTO" --reload
