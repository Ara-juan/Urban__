# Instalacion limpia y arranque del backend FastAPI de Urban Clothes.
# Uso: PowerShell -ExecutionPolicy Bypass -File .\setup.ps1
#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$candidatos = @(
    @{ Archivo = 'py';     Args = @('-3.12') },
    @{ Archivo = 'py';     Args = @('-3.11') },
    @{ Archivo = 'py';     Args = @('-3.13') },
    @{ Archivo = 'py';     Args = @('-3.10') },
    @{ Archivo = 'python'; Args = @() }
)

$python = $null
foreach ($candidato in $candidatos) {
    if (Get-Command $candidato.Archivo -ErrorAction SilentlyContinue) {
        $prueba = @($candidato.Args) + @('-c', 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)')
        & $candidato.Archivo @prueba 2>$null
        if ($LASTEXITCODE -eq 0) {
            $python = $candidato
            break
        }
    }
}

if ($null -eq $python) {
    Write-Host 'ERROR: se requiere Python 3.10 o superior y no se encontro en el PATH.'
    exit 1
}

$version = & $python.Archivo @(@($python.Args) + @('--version'))
Write-Host "==> Usando $version"

# 1. Entorno virtual aislado
$venvPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path $venvPython)) {
    Write-Host '==> Creando entorno virtual en backend_python\.venv'
    & $python.Archivo @(@($python.Args) + @('-m', 'venv', '.venv'))
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el entorno virtual.' }
}

# 2. Dependencias
Write-Host '==> Instalando dependencias'
& $venvPython -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw 'No se pudo actualizar pip.' }
& $venvPython -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias.' }

# 3. Variables de entorno
if (-not (Test-Path '.env')) {
    if (Test-Path '..\backend\.env') {
        Copy-Item -Path '..\backend\.env' -Destination '.env'
        Write-Host '==> Se copio ..\backend\.env a backend_python\.env'
        Write-Host '    Anade RESEND_API_KEY si quieres habilitar la recuperacion por correo.'
    }
    else {
        Copy-Item -Path '.env.example' -Destination '.env'
        Write-Host 'ERROR: no existe backend_python\.env. Se creo desde .env.example.'
        Write-Host '       Edita DB_*, JWT_SECRET y RESEND_API_KEY y vuelve a ejecutar .\setup.ps1'
        exit 1
    }
}

# 4. Servidor
$puerto = if ($env:PORT) { $env:PORT } else { '3000' }
Write-Host "==> Servidor FastAPI en http://localhost:$puerto"
Write-Host "    Documentacion interactiva: http://localhost:$puerto/docs"
& $venvPython -m uvicorn main:app --host 0.0.0.0 --port $puerto --reload
