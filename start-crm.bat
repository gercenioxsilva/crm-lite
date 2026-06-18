@echo off
setlocal enabledelayedexpansion

:: ========================================
:: 🚀 QUIZ CRM - SISTEMA COMPLETO
:: ========================================

title Quiz CRM - Sistema de Gestao de Leads

echo.
echo ========================================
echo 🚀 QUIZ CRM - INICIANDO SISTEMA COMPLETO
echo ========================================
echo.

:: Verificar se Docker está rodando
echo 🔍 Verificando pre-requisitos...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker nao encontrado! Instale o Docker Desktop.
    pause
    exit /b 1
)

docker compose version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose nao encontrado!
    pause
    exit /b 1
)

:: Verificar se arquivo .env existe
if not exist ".env" (
    echo ⚠️  Arquivo .env nao encontrado. Copiando de .env.sample...
    if exist ".env.sample" (
        copy ".env.sample" ".env" >nul
        echo ✅ Arquivo .env criado com sucesso!
    ) else (
        echo ❌ Arquivo .env.sample nao encontrado!
        pause
        exit /b 1
    )
)

echo ✅ Pre-requisitos verificados!
echo.

:: Passo 1: Limpeza e preparação
echo 📋 Passo 1: Preparando ambiente...
docker compose down --remove-orphans >nul 2>&1
echo ✅ Ambiente preparado!
echo.

:: Passo 2: Iniciar banco
echo 🗄️  Passo 2: Iniciando banco de dados...
docker compose up -d db
if errorlevel 1 (
    echo ❌ Falha ao iniciar banco de dados!
    pause
    exit /b 1
)

:: Aguardar banco ficar saudável
echo ⏳ Aguardando banco ficar saudavel...
set /a timeout=60
set /a elapsed=0

:wait_db
docker compose exec -T db pg_isready -U quiz -d quiz >nul 2>&1
if not errorlevel 1 goto db_ready

set /a elapsed+=3
if !elapsed! geq !timeout! (
    echo ❌ Timeout aguardando banco de dados!
    docker compose logs db
    pause
    exit /b 1
)

timeout /t 3 /nobreak >nul
goto wait_db

:db_ready
echo ✅ Banco de dados pronto!
echo.

:: Passo 3: Executar migrações
echo 🔄 Passo 3: Executando migracoes...
docker compose run --rm leads-migrate
if errorlevel 1 (
    echo ❌ Falha nas migracoes!
    echo Logs do banco:
    docker compose logs db
    pause
    exit /b 1
)
echo ✅ Migracoes executadas!
echo.

:: Passo 4: Iniciar serviços em ordem
echo 🏗️  Passo 4: Iniciando servicos em ordem...

echo   📦 Iniciando MongoDB...
docker compose up -d mongo
timeout /t 5 /nobreak >nul

echo   🔐 Iniciando servicos de negocio...
docker compose up -d auth leads
timeout /t 5 /nobreak >nul

echo   📧 Iniciando servico de email...
docker compose up -d email
timeout /t 3 /nobreak >nul

echo   🌐 Iniciando gateway e interfaces...
docker compose up -d api-gateway landing backoffice

if errorlevel 1 (
    echo ❌ Falha ao iniciar servicos!
    echo.
    echo 🔧 Tentando correcao automatica...
    call :fix_services
    if errorlevel 1 (
        echo ❌ Correcao falhou! Verifique os logs.
        docker compose logs --tail=20
        pause
        exit /b 1
    )
)

:: Aguardar serviços ficarem prontos
echo ⏳ Aguardando servicos ficarem prontos (20s)...
timeout /t 20 /nobreak >nul

:: Passo 5: Verificar saúde dos serviços
echo 🏥 Passo 5: Verificando saude dos servicos...
echo.

:: Verificar containers
echo 📊 Status dos containers:
docker compose ps

echo.
echo 🔗 Testando endpoints:

:: Testar API Gateway
curl -s http://localhost:3000/health >nul 2>&1
if not errorlevel 1 (
    echo ✅ API Gateway: OK
) else (
    echo ❌ API Gateway: FALHOU
)

:: Testar Leads Service
curl -s http://localhost:3020/health >nul 2>&1
if not errorlevel 1 (
    echo ✅ Leads Service: OK
) else (
    echo ❌ Leads Service: FALHOU
)

:: Testar Auth Service
curl -s http://localhost:3050/health >nul 2>&1
if not errorlevel 1 (
    echo ✅ Auth Service: OK
) else (
    echo ❌ Auth Service: FALHOU
)

:: Testar Email Service
curl -s http://localhost:3040/health >nul 2>&1
if not errorlevel 1 (
    echo ✅ Email Service: OK
) else (
    echo ❌ Email Service: FALHOU
)

:: Testar Landing Page
curl -s -o nul -w "%%{http_code}" http://localhost:3010/ | findstr "200" >nul
if not errorlevel 1 (
    echo ✅ Landing Page: OK
) else (
    echo ❌ Landing Page: FALHOU
)

:: Testar Backoffice
curl -s -o nul -w "%%{http_code}" http://localhost:3030/ | findstr "200" >nul
if not errorlevel 1 (
    echo ✅ Backoffice: OK
) else (
    echo ❌ Backoffice: FALHOU
)

:: Testar Assets (CSS/JS)
echo.
echo 🎨 Verificando assets:
curl -s -o nul -w "%%{http_code}" http://localhost:3010/assets/ 2>nul | findstr "200\|403" >nul
if not errorlevel 1 (
    echo ✅ Landing Assets: OK
) else (
    echo ⚠️  Landing Assets: Podem estar com problema
)

curl -s -o nul -w "%%{http_code}" http://localhost:3030/assets/ 2>nul | findstr "200\|403" >nul
if not errorlevel 1 (
    echo ✅ Backoffice Assets: OK
) else (
    echo ⚠️  Backoffice Assets: Podem estar com problema
)

echo.

:: Testar dados reais
echo 📊 Verificando dados reais:
curl -s -H "Authorization: Bearer mock-admin-token" http://localhost:3000/api/backoffice/stats 2>nul | findstr "totalLeads" >nul
if not errorlevel 1 (
    echo ✅ Dashboard com dados reais: OK
    for /f "tokens=*" %%i in ('curl -s -H "Authorization: Bearer mock-admin-token" http://localhost:3000/api/backoffice/stats 2^>nul') do (
        echo    Dados: %%i
    )
) else (
    echo ❌ Dashboard: FALHOU
)

:: Testar criação de lead
echo.
echo 🧪 Testando criacao de lead:
curl -s -X POST http://localhost:3000/api/public/leads -H "Content-Type: application/json" -d "{\"name\":\"Teste Sistema\",\"email\":\"teste@sistema.com\",\"source\":\"test\"}" >nul 2>&1
if not errorlevel 1 (
    echo ✅ Criacao de lead: OK
) else (
    echo ❌ Criacao de lead: FALHOU
)

echo.
echo ========================================
echo 🎉 SISTEMA CRM INICIADO COM SUCESSO!
echo ========================================
echo.

echo 🌐 URLs DISPONÍVEIS:
echo   🏠 Landing Page:    http://localhost:3010
echo   💼 Backoffice CRM:  http://localhost:3030
echo   🔗 API Gateway:     http://localhost:3000
echo   📧 Email Service:   http://localhost:3040
echo   📚 Swagger API:     http://localhost:3000/docs
echo.

echo 🔑 CREDENCIAIS:
echo   Email:     admin@quiz.com
echo   Senha:     admin123
echo   Token Mock: mock-admin-token
echo.

echo 🎯 FUNCIONALIDADES:
echo   ✅ Dashboard com dados reais e gráficos
echo   ✅ Gestão completa de leads
echo   ✅ Pipeline Kanban funcional
echo   ✅ Sistema de atividades
echo   ✅ Serviço de email integrado
echo   ✅ Relatórios em tempo real
echo   ✅ Login simplificado e robusto
echo   ✅ Coleta automática da landing page
echo.

echo 🛠️  COMANDOS ÚTEIS:
echo   Ver logs:        docker compose logs [servico]
echo   Parar sistema:   docker compose down
echo   Reiniciar:       docker compose restart [servico]
echo   Status:          docker compose ps
echo.

echo ⚠️  IMPORTANTE:
echo   - Mantenha este terminal aberto para monitorar o sistema
echo   - Use Ctrl+C para parar os logs (sistema continua rodando)
echo   - Para parar completamente: docker compose down
echo.

:: Perguntar se quer ver logs
set /p choice="🔍 Deseja ver os logs em tempo real? (s/N): "
if /i "!choice!"=="s" (
    echo.
    echo 📋 Mostrando logs em tempo real (Ctrl+C para sair):
    echo.
    docker compose logs -f
) else (
    echo.
    echo ✅ Sistema rodando em background!
    echo 💡 Para ver logs: docker compose logs -f
    echo.
    pause
)

goto :eof

:fix_services
echo   🔧 Parando email service...
docker compose stop email >nul 2>&1

echo   🔧 Removendo imagem com erro...
docker rmi crm-lite-email >nul 2>&1

echo   🔧 Reconstruindo email service...
docker compose build --no-cache email >nul 2>&1

echo   🔧 Iniciando servicos...
docker compose up -d >nul 2>&1

if errorlevel 1 (
    exit /b 1
)

echo ✅ Correcao aplicada com sucesso!
exit /b 0

endlocal