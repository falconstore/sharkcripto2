@echo off
title MEXC WebSocket Monitor
echo ========================================
echo   MEXC WebSocket Monitor - Iniciando
echo ========================================
echo.

cd /d "%~dp0"

REM Verificar se .env existe
if not exist ".env" (
    echo [ERRO] Arquivo .env nao encontrado!
    echo.
    echo Crie o arquivo .env com:
    echo   SUPABASE_URL=https://jschuymzkukzthesevoy.supabase.co
    echo   SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui
    echo.
    pause
    exit /b 1
)

REM Verificar se dist existe
if not exist "dist\index.js" (
    echo [AVISO] Codigo nao compilado. Executando build...
    npm run build
)

echo Iniciando monitor...
echo Pressione Ctrl+C para parar
echo.

node dist/index.js

echo.
echo Monitor encerrado.
pause
