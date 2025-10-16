@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo 🔧 TROUBLESHOOT CRM - DIAGNÓSTICO
echo ========================================
echo.

echo 🔍 Verificando pré-requisitos...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker não encontrado!
    echo 💡 Instale o Docker Desktop
    pause
    exit /b 1
) else (
    echo ✅ Docker encontrado
)

docker compose version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose não encontrado!
    pause
    exit /b 1
) else (
    echo ✅ Docker Compose encontrado
)

echo.
echo 🔍 Verificando portas em uso...
netstat -an | findstr ":3000 " >nul && echo ⚠️  Porta 3000 em uso || echo ✅ Porta 3000 livre
netstat -an | findstr ":3010 " >nul && echo ⚠️  Porta 3010 em uso || echo ✅ Porta 3010 livre
netstat -an | findstr ":3020 " >nul && echo ⚠️  Porta 3020 em uso || echo ✅ Porta 3020 livre
netstat -an | findstr ":3030 " >nul && echo ⚠️  Porta 3030 em uso || echo ✅ Porta 3030 livre
netstat -an | findstr ":3040 " >nul && echo ⚠️  Porta 3040 em uso || echo ✅ Porta 3040 livre
netstat -an | findstr ":3050 " >nul && echo ⚠️  Porta 3050 em uso || echo ✅ Porta 3050 livre
netstat -an | findstr ":5432 " >nul && echo ⚠️  Porta 5432 em uso || echo ✅ Porta 5432 livre
netstat -an | findstr ":27017 " >nul && echo ⚠️  Porta 27017 em uso || echo ✅ Porta 27017 livre

echo.
echo 🔍 Status dos containers...
docker compose ps

echo.
echo 🔍 Verificando logs de erro...
echo.
echo === LOGS DO BANCO DE DADOS ===
docker compose logs --tail=10 db 2>nul

echo.
echo === LOGS DO EMAIL SERVICE ===
docker compose logs --tail=10 email 2>nul

echo.
echo === LOGS DO API GATEWAY ===
docker compose logs --tail=10 api-gateway 2>nul

echo.
echo 🔍 Testando conectividade...
ping -n 1 localhost >nul 2>&1
if errorlevel 1 (
    echo ❌ Problema de rede local
) else (
    echo ✅ Rede local OK
)

echo.
echo 🔧 Opções de correção:
echo   1. Restart simples
echo   2. Rebuild completo
echo   3. Limpeza total
echo   4. Verificar logs completos
echo   5. Sair
echo.
set /p fix="Escolha uma opção (1-5): "

if "!fix!"=="1" (
    echo.
    echo 🔄 Reiniciando sistema...
    docker compose restart
    echo ✅ Reinicialização concluída!
) else if "!fix!"=="2" (
    echo.
    echo 🏗️ Reconstruindo sistema...
    docker compose down
    docker compose build --no-cache
    docker compose up -d
    echo ✅ Rebuild concluído!
) else if "!fix!"=="3" (
    echo.
    echo 🧹 Limpeza total...
    docker compose down --volumes --remove-orphans
    docker system prune -af
    docker volume prune -f
    echo ✅ Limpeza concluída! Execute start-crm.bat
) else if "!fix!"=="4" (
    echo.
    echo 📋 Logs completos:
    docker compose logs
) else (
    echo.
    echo ✅ Diagnóstico concluído!
)

echo.
pause
endlocal