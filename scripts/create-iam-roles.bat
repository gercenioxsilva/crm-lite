@echo off
REM Script simplificado para criar role IAM mínimo necessário para ECS

echo 🔑 Criando role IAM para ECS...

REM Verificar se ecsTaskExecutionRole existe
aws iam get-role --role-name ecsTaskExecutionRole >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ ecsTaskExecutionRole já existe
) else (
    echo 📝 Criando ecsTaskExecutionRole...
    
    REM Criar arquivo temporário de política
    echo {"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]} > trust-policy.json
    
    REM Criar role de execução
    aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document file://trust-policy.json
    
    REM Anexar política gerenciada
    aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
    
    REM Limpar arquivo temporário
    del trust-policy.json
    
    echo ✅ ecsTaskExecutionRole criado com sucesso
)

echo 🎉 Role IAM criado/verificado com sucesso!
echo.
echo 📋 Role disponível:
echo    - ecsTaskExecutionRole: Para execução de containers ECS
echo.
echo 🚀 Agora você pode executar o deploy do Terraform normalmente.
pause