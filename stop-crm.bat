@echo off
setlocal enabledelayedexpansion

:: ========================================
:: 🛑 QUIZ CRM - PARAR SISTEMA
:: ========================================

title Quiz CRM - Parando Sistema



echo.
echo ========================================
echo 🛑 QUIZ CRM - PARANDO SISTEMA
echo ========================================
echo.

echo 📋 Parando todos os serviços...
docker compose down

if errorlevel 1 (
    echo ⚠️  Alguns containers podem não ter parado corretamente.
    echo 🔧 Forçando parada...
    docker compose kill
    docker compose down --remove-orphans
)

echo.
echo 🧹 Opções de limpeza:
echo   1. Manter dados (recomendado)
echo   2. Limpar volumes (remove dados)
echo   3. Limpeza completa (remove tudo)
echo.
set /p cleanup="Escolha uma opção (1-3): "

if "!cleanup!"=="2" (
    echo 🗑️  Removendo volumes...
    docker compose down --volumes
    echo ✅ Volumes removidos!
) else if "!cleanup!"=="3" (
    echo 🗑️  Removendo volumes...
    docker compose down --volumes --remove-orphans
    
    echo 🧹 Limpando sistema Docker...
    docker system prune -af
    
    echo 🗑️  Removendo imagens do projeto...
    docker rmi crm-lite-api-gateway crm-lite-auth crm-lite-leads crm-lite-email crm-lite-backoffice crm-lite-landing 2>nul
    
    echo ✅ Limpeza completa realizada!
) else (
    echo 💾 Dados preservados.
)

echo.
echo ✅ Sistema parado com sucesso!
echo.
echo 💡 Comandos úteis:
echo   Reiniciar: start-crm.bat
echo   Status:    status-crm.bat
echo   Logs:      docker compose logs
echo.
pause

endlocal