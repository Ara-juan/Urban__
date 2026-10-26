# instalacion limpia y arranque del backend fastapi de urban clothes
# uso powershell -executionpolicy bypass -file .\setup.ps1
#requires -version 5.1

# detenemos la ejecucion inmediatamente si ocurre algun error
$ErrorActionPreference = 'Stop'

# nos ubicamos en la misma carpeta donde esta guardado este script
Set-Location -LiteralPath $PSScriptRoot

# armamos una lista con los comandos de python que vamos a buscar
$candidatos = @(
    @{ Archivo = 'py';     Args = @('-3.12') },
    @{ Archivo = 'py';     Args = @('-3.11') },
    @{ Archivo = 'py';     Args = @('-3.13') },
    @{ Archivo = 'py';     Args = @('-3.10') },
    @{ Archivo = 'python'; Args = @() }
)

$python = $null

# recorremos la lista probando uno por uno a ver cual nos sirve
foreach ($candidato in $candidatos) {
    if (Get-Command $candidato.Archivo -ErrorAction SilentlyContinue) {
        # le decimos a python que nos confirme si la version es mayor o igual a 3.10
        $prueba = @($candidato.Args) + @('-c', 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)')
        & $candidato.Archivo @prueba 2>$null
        
        # si todo salio bien guardamos esta version y paramos de buscar
        if ($LASTEXITCODE -eq 0) {
            $python = $candidato
            break
        }
    }
}

# si llegamos aca y no encontramos nada avisamos que falta instalar python
if ($null -eq $python) {
    Write-Host 'ERROR: se requiere Python 3.10 o superior y no se encontro en el PATH.'
    exit 1
}

# sacamos el numero exacto de la version que vamos a usar y lo mostramos
$version = & $python.Archivo @(@($python.Args) + @('--version'))
Write-Host "==> Usando $version"

# 1 entorno virtual aislado
$venvPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'

# si la carpeta del entorno no existe la creamos desde cero para no mezclar cosas
if (-not (Test-Path $venvPython)) {
    Write-Host '==> Creando entorno virtual en backend_python\.venv'
    & $python.Archivo @(@($python.Args) + @('-m', 'venv', '.venv'))
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el entorno virtual.' }
}

# 2 dependencias
Write-Host '==> Instalando dependencias'

# actualizamos pip para no tener problemas con librerias nuevas
& $venvPython -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw 'No se pudo actualizar pip.' }

# instalamos todo lo que pide el archivo de requerimientos
& $venvPython -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias.' }

# 3 variables de entorno
if (-not (Test-Path '.env')) {
    # si el proyecto viejo de node ya tenia configuracion la reciclamos aca
    if (Test-Path '..\backend\.env') {
        Copy-Item -Path '..\backend\.env' -Destination '.env'
        Write-Host '==> Se copio ..\backend\.env a backend_python\.env'
        Write-Host '    Anade RESEND_API_KEY si quieres habilitar la recuperacion por correo.'
    }
    else {
        # si no hay nada copiamos el archivo de ejemplo y paramos todo para que lo llenen
        Copy-Item -Path '.env.example' -Destination '.env'
        Write-Host 'ERROR: no existe backend_python\.env. Se creo desde .env.example.'
        Write-Host '       Edita DB_*, JWT_SECRET y RESEND_API_KEY y vuelve a ejecutar .\setup.ps1'
        exit 1
    }
}

# 4 servidor
# sacamos el puerto de las variables o usamos el 3000 si no configuraron nada
$puerto = if ($env:PORT) { $env:PORT } else { '3000' }
Write-Host "==> Servidor FastAPI en http://localhost:$puerto"
Write-Host "    Documentacion interactiva: http://localhost:$puerto/docs"

# por ultimo encendemos el servidor en modo desarrollo para que se recargue solo
& $venvPython -m uvicorn main:app --host 0.0.0.0 --port $puerto --reload