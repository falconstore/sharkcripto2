@echo off
echo ========================================
echo   MEXC WebSocket Monitor - Instalacao
echo ========================================
echo.

REM Verificar se Node.js esta instalado
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Por favor, instale o Node.js em: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js encontrado
node --version

REM Navegar para o diretorio do projeto
cd /d "%~dp0"

REM Instalar dependencias
echo.
echo Instalando dependencias...
npm install

if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Falha ao instalar dependencias
    pause
    exit /b 1
)

REM Compilar TypeScript
echo.
echo Compilando TypeScript...
npm run build

if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Falha ao compilar
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Instalacao concluida com sucesso!
echo ========================================
echo.
echo Proximo passo: Configure o arquivo .env
echo Depois execute: start.bat
echo.
pause
