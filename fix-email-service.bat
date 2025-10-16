@echo off
echo 🔧 Corrigindo Email Service...

echo.
echo 1. Parando email service...
docker-compose stop email

echo.
echo 2. Removendo imagem com erro...
docker rmi crm-lite-email 2>nul

echo.
echo 3. Reconstruindo email service...
docker-compose build --no-cache email

echo.
echo 4. Iniciando email service...
docker-compose up -d email

echo.
echo 5. Verificando status...
timeout /t 5 /nobreak >nul
curl -s http://localhost:3040/health

echo.
echo ✅ Email service corrigido!
pause