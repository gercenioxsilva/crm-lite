@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo 🔍 VERIFICACAO DO SISTEMA CRM
echo ========================================
echo.

echo 📦 Status dos containers:
docker compose ps
echo.

echo 🌐 Testando endpoints:

echo   💼 Backoffice (3030):
curl -s -o nul -w "Status: %%{http_code}" http://localhost:3030/
echo.

echo   🏠 Landing (3010):
curl -s -o nul -w "Status: %%{http_code}" http://localhost:3010/
echo.

echo   🔗 API Gateway (3000):
curl -s -o nul -w "Status: %%{http_code}" http://localhost:3000/health
echo.

echo   📊 Leads Service (3020):
curl -s -o nul -w "Status: %%{http_code}" http://localhost:3020/health
echo.

echo   🔐 Auth Service (3050):
curl -s -o nul -w "Status: %%{http_code}" http://localhost:3050/health
echo.

echo   📧 Email Service (3040):
curl -s -o nul -w "Status: %%{http_code}" http://localhost:3040/health
echo.

echo 📊 Testando dados do sistema:
curl -s -H "Authorization: Bearer mock-admin-token" http://localhost:3000/backoffice/stats
echo.

echo 🧪 Testando criacao de lead:
curl -s -X POST http://localhost:3000/public/leads -H "Content-Type: application/json" -d "{\"name\":\"Teste Status\",\"email\":\"status@test.com\",\"source\":\"status-check\"}"
echo.

echo.
echo ========================================
echo 🌐 URLs DISPONIVEIS:
echo   💼 Backoffice: http://localhost:3030
echo   🏠 Landing:    http://localhost:3010
echo   📧 Emails:     http://localhost:3040/health
echo   📚 API Docs:   http://localhost:3000/docs
echo.
echo 🔑 CREDENCIAIS:
echo   Email: admin@quiz.com
echo   Senha: admin123
echo ========================================
echo.

set /p action="Escolha uma acao (L=logs, R=restart, S=stop, Enter=sair): "

if /i "!action!"=="L" (
    echo.
    echo 📋 Mostrando logs (Ctrl+C para sair):
    docker compose logs -f
) else if /i "!action!"=="R" (
    echo.
    echo 🔄 Reiniciando sistema...
    call start-crm.bat
) else if /i "!action!"=="S" (
    echo.
    echo 🛑 Parando sistema...
    call stop-crm.bat
) else (
    echo.
    echo ✅ Verificacao concluida!
)

endlocal