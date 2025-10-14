@echo off
echo ========================================
echo TESTE COMPLETO: LOGIN E COLETA DE LEADS
echo ========================================
echo.

echo 1. Testando Backoffice (Login):
curl -s -o nul -w "Status: %%{http_code}" http://localhost:3030/
echo.

echo 2. Testando Landing Page:
curl -s -o nul -w "Status: %%{http_code}" http://localhost:3010/
echo.

echo 3. Testando API Gateway:
curl -s -o nul -w "Status: %%{http_code}" http://localhost:3000/health
echo.

echo 4. Testando Auth Service:
curl -s -o nul -w "Status: %%{http_code}" http://localhost:3050/health
echo.

echo 5. Testando Leads Service:
curl -s -o nul -w "Status: %%{http_code}" http://localhost:3020/health
echo.

echo 6. Verificando leads coletados:
curl -s -H "Authorization: Bearer mock-admin-token" http://localhost:3000/backoffice/leads | findstr "name" | head -5
echo.

echo 7. Testando criacao de lead via landing:
curl -s -X POST http://localhost:3000/public/leads ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Teste Usuario\",\"email\":\"teste@email.com\",\"company\":\"Empresa Teste\",\"source\":\"test\"}"
echo.

echo 8. Verificando se novo lead foi criado:
curl -s -H "Authorization: Bearer mock-admin-token" http://localhost:3000/backoffice/stats
echo.

echo ========================================
echo CREDENCIAIS DE LOGIN:
echo   Email: admin@quiz.com
echo   Senha: admin123
echo.
echo URLs:
echo   Backoffice: http://localhost:3030
echo   Landing:    http://localhost:3010
echo ========================================
echo.
pause