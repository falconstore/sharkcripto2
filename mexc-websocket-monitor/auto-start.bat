@echo off
echo ========================================
echo   Configurar Inicio Automatico
echo ========================================
echo.

set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SCRIPT_PATH=%~dp0start.bat

echo Criando atalho para inicializacao automatica...
echo.

REM Criar atalho usando PowerShell
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%STARTUP_FOLDER%\MEXC Monitor.lnk'); $s.TargetPath = '%SCRIPT_PATH%'; $s.WorkingDirectory = '%~dp0'; $s.WindowStyle = 7; $s.Save()"

if %ERRORLEVEL% EQU 0 (
    echo [OK] Atalho criado com sucesso!
    echo.
    echo Localizacao: %STARTUP_FOLDER%\MEXC Monitor.lnk
    echo.
    echo O monitor iniciara automaticamente quando o Windows iniciar.
    echo Para remover, delete o atalho na pasta Startup.
) else (
    echo [ERRO] Falha ao criar atalho.
)

echo.
pause
