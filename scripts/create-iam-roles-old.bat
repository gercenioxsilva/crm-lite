@echo off
REM Script para criar roles IAM necessários para ECS no Windows
REM Execute este script antes do deploy do Terraform se os roles não existirem

echo 🔑 Criando roles IAM para ECS...

REM Verificar se ecsTaskExecutionRole existe
aws iam get-role --role-name ecsTaskExecutionRole >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ ecsTaskExecutionRole já existe
) else (
    echo 📝 Criando ecsTaskExecutionRole...
    
    REM Criar role de execução
    aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"ecs-tasks.amazonaws.com\"},\"Action\":\"sts:AssumeRole\"}]}"
    
    REM Anexar política gerenciada
    aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
    
    echo ✅ ecsTaskExecutionRole criado com sucesso
)

REM Verificar se ecsTaskRole existe
aws iam get-role --role-name ecsTaskRole >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ ecsTaskRole já existe
) else (
    echo 📝 Criando ecsTaskRole...
    
    REM Criar role de task
    aws iam create-role --role-name ecsTaskRole --assume-role-policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"ecs-tasks.amazonaws.com\"},\"Action\":\"sts:AssumeRole\"}]}"
    
    REM Criar política personalizada para SES e SQS
    aws iam put-role-policy --role-name ecsTaskRole --policy-name SESAndSQSAccess --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"ses:SendEmail\",\"ses:SendRawEmail\",\"sqs:SendMessage\",\"sqs:ReceiveMessage\",\"sqs:DeleteMessage\",\"sqs:GetQueueAttributes\"],\"Resource\":\"*\"}]}"
    
    echo ✅ ecsTaskRole criado com sucesso
)

echo 🎉 Todos os roles IAM foram criados/verificados com sucesso!
echo.
echo 📋 Roles disponíveis:
echo    - ecsTaskExecutionRole: Para execução de containers ECS
echo    - ecsTaskRole: Para acesso a SES e SQS pelos containers
echo.
echo 🚀 Agora você pode executar o deploy do Terraform normalmente.
pause