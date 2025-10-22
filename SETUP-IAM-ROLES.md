# 🔑 Setup Manual de Roles IAM

## ⚠️ Ação Necessária

O deploy falhou porque os roles IAM necessários não existem. Execute os comandos abaixo **UMA VEZ** para criar os roles:

## 🛠️ Comandos para Executar

### 1. Criar ecsTaskExecutionRole

```bash
# Criar arquivo de política de confiança
cat > trust-policy.json << EOF
{
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
}
EOF

# Criar o role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file://trust-policy.json

# Anexar política gerenciada
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Limpar arquivo temporário
rm trust-policy.json
```

### 2. Verificar Criação

```bash
aws iam get-role --role-name ecsTaskExecutionRole
```

## 🚀 Após Executar

1. Execute os comandos acima
2. Faça um novo push para `main` ou re-execute o workflow
3. O deploy deve funcionar normalmente

## 📋 Alternativa: Script Automático

Execute o script fornecido:

**Linux/Mac:**
```bash
chmod +x scripts/create-iam-roles.sh
./scripts/create-iam-roles.sh
```

**Windows:**
```cmd
scripts\create-iam-roles.bat
```

---

**⚡ Importante**: Estes roles precisam ser criados apenas UMA VEZ por conta AWS.