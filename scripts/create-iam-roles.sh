#!/bin/bash

# Script para criar roles IAM necessários para ECS
# Execute este script antes do deploy do Terraform se os roles não existirem

set -e

echo "🔑 Criando roles IAM para ECS..."

# Verificar se ecsTaskExecutionRole existe
if aws iam get-role --role-name ecsTaskExecutionRole >/dev/null 2>&1; then
    echo "✅ ecsTaskExecutionRole já existe"
else
    echo "📝 Criando ecsTaskExecutionRole..."
    
    # Criar role de execução
    aws iam create-role \
        --role-name ecsTaskExecutionRole \
        --assume-role-policy-document '{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                        "Service": "ecs-tasks.amazonaws.com"
                    },
                    "Action": "sts:AssumeRole"
                }
            ]
        }'
    
    # Anexar política gerenciada
    aws iam attach-role-policy \
        --role-name ecsTaskExecutionRole \
        --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
    
    echo "✅ ecsTaskExecutionRole criado com sucesso"
fi

# Verificar se ecsTaskRole existe
if aws iam get-role --role-name ecsTaskRole >/dev/null 2>&1; then
    echo "✅ ecsTaskRole já existe"
else
    echo "📝 Criando ecsTaskRole..."
    
    # Criar role de task
    aws iam create-role \
        --role-name ecsTaskRole \
        --assume-role-policy-document '{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                        "Service": "ecs-tasks.amazonaws.com"
                    },
                    "Action": "sts:AssumeRole"
                }
            ]
        }'
    
    # Criar política personalizada para SES e SQS
    aws iam put-role-policy \
        --role-name ecsTaskRole \
        --policy-name SESAndSQSAccess \
        --policy-document '{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "ses:SendEmail",
                        "ses:SendRawEmail",
                        "sqs:SendMessage",
                        "sqs:ReceiveMessage",
                        "sqs:DeleteMessage",
                        "sqs:GetQueueAttributes"
                    ],
                    "Resource": "*"
                }
            ]
        }'
    
    echo "✅ ecsTaskRole criado com sucesso"
fi

echo "🎉 Todos os roles IAM foram criados/verificados com sucesso!"
echo ""
echo "📋 Roles disponíveis:"
echo "   - ecsTaskExecutionRole: Para execução de containers ECS"
echo "   - ecsTaskRole: Para acesso a SES e SQS pelos containers"
echo ""
echo "🚀 Agora você pode executar o deploy do Terraform normalmente."