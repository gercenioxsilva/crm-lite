@echo off
echo.
echo ========================================
echo VERIFICACAO RAPIDA DO SISTEMA CRM
echo ========================================
echo.

echo Status dos containers:
docker compose ps

echo.
echo Testando endpoints:

echo   Backoffice (3030):
curl -s -o nul -w "Status: %%{http_code}" http://localhost:3030/
echo.

echo   Landing (3010):
curl -s -o nul -w "Status: %%{http_code}" http://localhost:3010/
echo.

echo   API Gateway (3000):
curl -s -o nul -w "Status: %%{http_code}" http://localhost:3000/health
echo.

echo   Leads Service (3020):
curl -s -o nul -w "Status: %%{http_code}" http://localhost:3020/health
echo.

echo   Auth Service (3050):
curl -s -o nul -w "Status: %%{http_code}" http://localhost:3050/health
echo.

echo.
echo Testando dados reais:
curl -s -H "Authorization: Bearer mock-admin-token" http://localhost:3000/backoffice/stats

echo.
echo.
echo ========================================
echo URLs DISPONIVEIS:
echo   Backoffice: http://localhost:3030
echo   Landing:    http://localhost:3010
echo   API Docs:   http://localhost:3000/docs
echo ========================================
echo.
pause