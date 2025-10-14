@echo off
setlocal enabledelayedexpansion

:: ========================================
:: 🛑 QUIZ CRM - PARAR SISTEMA
:: ========================================

title Quiz CRM - Parando Sistema

:: Cores para output
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "RESET=[0m"

echo.
echo %BLUE%========================================%RESET%
echo %BLUE%🛑 QUIZ CRM - PARANDO SISTEMA%RESET%
echo %BLUE%========================================%RESET%
echo.

echo %YELLOW%📋 Parando todos os serviços...%RESET%
docker compose down

echo.
echo %YELLOW%🧹 Limpando recursos (opcional)...%RESET%
set /p cleanup="Deseja limpar volumes e imagens não utilizadas? (s/N): "

if /i "!cleanup!"=="s" (
    echo %YELLOW%🗑️  Removendo volumes...%RESET%
    docker compose down --volumes
    
    echo %YELLOW%🧹 Limpando sistema Docker...%RESET%
    docker system prune -f
    
    echo %GREEN%✅ Limpeza completa realizada!%RESET%
) else (
    echo %BLUE%💾 Dados preservados.%RESET%
)

echo.
echo %GREEN%✅ Sistema parado com sucesso!%RESET%
echo.
echo %YELLOW%💡 Para reiniciar: start-crm.bat%RESET%
echo.
pause

endlocal