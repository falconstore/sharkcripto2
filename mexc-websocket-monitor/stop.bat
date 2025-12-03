@echo off
echo ========================================
echo   MEXC WebSocket Monitor - Parando
echo ========================================
echo.

echo Procurando processos do monitor...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq MEXC WebSocket Monitor*" 2>nul

if %ERRORLEVEL% EQU 0 (
    echo [OK] Monitor parado com sucesso!
) else (
    echo [INFO] Nenhum processo do monitor encontrado.
)

echo.
timeout /t 3
