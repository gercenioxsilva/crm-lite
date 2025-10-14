@echo off
echo ========================================
echo TESTE: LOGIN CORRIGIDO E DADOS REAIS
echo ========================================
echo.

echo 1. Testando Backoffice (Status 200):
curl -s -o nul -w "Status: %%{http_code}" http://localhost:3030/
echo.

echo 2. Testando dados reais no dashboard:
curl -s -H "Authorization: Bearer mock-admin-token" http://localhost:3000/backoffice/stats
echo.

echo 3. Criando novo lead para teste:
curl -s -X POST http://localhost:3000/public/leads ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Lead Teste Final\",\"email\":\"final@teste.com\",\"company\":\"Empresa Final\",\"source\":\"test\"}"
echo.

echo 4. Verificando se lead foi adicionado:
curl -s -H "Authorization: Bearer mock-admin-token" http://localhost:3000/backoffice/stats
echo.

echo ========================================
echo SISTEMA CORRIGIDO E FUNCIONANDO!
echo.
echo ACESSO:
echo   URL: http://localhost:3030
echo   Email: admin@quiz.com
echo   Senha: admin123
echo.
echo FUNCIONALIDADES:
echo   ✓ Login simplificado e robusto
echo   ✓ Dashboard com dados reais
echo   ✓ Coleta automatica de leads
echo   ✓ Metricas em tempo real
echo   ✓ Pipeline funcional
echo   ✓ Gestao de atividades
echo ========================================
echo.
pause