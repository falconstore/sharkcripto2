@echo off
title MEXC WebSocket Monitor [DEV]
echo ========================================
echo   MEXC WebSocket Monitor - Modo DEV
echo ========================================
echo.

cd /d "%~dp0"

REM Verificar se .env existe
if not exist ".env" (
    echo [ERRO] Arquivo .env nao encontrado!
    echo.
    echo Crie o arquivo .env baseado no .env.example
    echo.
    pause
    exit /b 1
)

echo Iniciando em modo desenvolvimento...
echo As alteracoes no codigo serao recarregadas automaticamente.
echo Pressione Ctrl+C para parar
echo.

npx ts-node src/index.ts

echo.
echo Monitor encerrado.
pause
