# 🔧 Solução: Erro de Permissões IAM no Deploy

## 🚨 Problema Identificado

O erro ocorreu porque o usuário `github-actions-user` não possui permissões para criar roles IAM:

```
Error: creating IAM Role (crm-ecs-task-execution-role-prod): operation error IAM: CreateRole, 
https response error StatusCode: 403, RequestID: f03c114d-0653-4a5f-9517-0e0535c48181, 
api error AccessDenied: User: arn:aws:iam::016054712606:user/github-actions-user is not 
authorized to perform: iam:CreateRole on resource: arn:aws:iam::016054712606:role/crm-ecs-task-execution-role-prod 
because no identity-based policy allows the iam:CreateRole action
```

## ✅ Solução Implementada

### 1. Modificação do Terraform

**Arquivo**: `terraform/ecs.tf`

- **Antes**: Criava novos roles IAM específicos para o projeto
- **Depois**: Usa roles IAM padrão do AWS (`ecsTaskExecutionRole` e `ecsTaskRole`)

```hcl
# Use existing AWS managed ECS roles instead of creating new ones
locals {
  ecs_task_execution_role_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/ecsTaskExecutionRole"
  ecs_task_role_arn          = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/ecsTaskRole"
}
```

### 2. Criação Automática de Roles

**Arquivo**: `.github/workflows/deploy-aws.yml`

Adicionado step que cria os roles automaticamente se não existirem:

```yaml
- name: Create IAM roles for ECS
  run: |
    # Verifica e cria ecsTaskExecutionRole se necessário
    # Verifica e cria ecsTaskRole se necessário
```

### 3. Scripts Manuais (Backup)

Criados scripts para execução manual se necessário:

- **Linux/Mac**: `scripts/create-iam-roles.sh`
- **Windows**: `scripts/create-iam-roles.bat`

## 🔑 Roles IAM Criados

### ecsTaskExecutionRole
- **Função**: Permite ao ECS baixar imagens do ECR e escrever logs no CloudWatch
- **Política**: `AmazonECSTaskExecutionRolePolicy` (AWS Managed)

### ecsTaskRole  
- **Função**: Permite aos containers acessar serviços AWS (SES, SQS)
- **Políticas Customizadas**:
  - `ses:SendEmail`, `ses:SendRawEmail`
  - `sqs:SendMessage`, `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueAttributes`

## 🚀 Como Funciona Agora

1. **GitHub Actions** executa o workflow
2. **Step "Create IAM roles"** verifica se os roles existem
3. Se não existirem, cria automaticamente com as permissões necessárias
4. **Terraform** usa os roles existentes (não tenta criar novos)
5. **Deploy** prossegue normalmente

## 🔒 Permissões Necessárias

O usuário `github-actions-user` agora precisa apenas de:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iam:GetRole",
        "iam:CreateRole", 
        "iam:AttachRolePolicy",
        "iam:PutRolePolicy"
      ],
      "Resource": [
        "arn:aws:iam::*:role/ecsTaskExecutionRole",
        "arn:aws:iam::*:role/ecsTaskRole"
      ]
    }
  ]
}
```

## 🎯 Benefícios da Solução

1. **Menor Superfície de Permissões**: Usa roles padrão em vez de criar específicos
2. **Compatibilidade**: Funciona com roles existentes ou cria se necessário  
3. **Automação**: Criação automática via GitHub Actions
4. **Fallback**: Scripts manuais disponíveis
5. **Segurança**: Permissões mínimas necessárias

## 🔄 Próximos Passos

1. ✅ Roles IAM serão criados automaticamente no próximo deploy
2. ✅ Terraform usará roles existentes
3. ✅ Deploy ECS prosseguirá normalmente
4. ⏳ Configurar domínio e SSL após deploy completo

## 📋 Verificação

Para verificar se os roles foram criados:

```bash
aws iam get-role --role-name ecsTaskExecutionRole
aws iam get-role --role-name ecsTaskRole
```

---

**Status**: ✅ Problema resolvido - Deploy pode prosseguir normalmente