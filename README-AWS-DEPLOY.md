# 🚀 Deploy CRM na AWS com GitHub Actions

## 📋 Pré-requisitos

### 1. Conta AWS
- Conta AWS ativa
- Usuário IAM com permissões necessárias
- Access Key e Secret Key

### 2. GitHub Secrets
Configure os seguintes secrets no repositório GitHub:

```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_ACCOUNT_ID=123456789012
```

### 3. Permissões IAM Necessárias
O usuário IAM precisa das seguintes permissões:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:*",
        "ecs:*",
        "ecr:*",
        "rds:*",
        "docdb:*",
        "elasticloadbalancing:*",
        "iam:*",
        "logs:*",
        "s3:*",
        "sqs:*",
        "ses:*",
        "servicediscovery:*",
        "route53:*"
      ],
      "Resource": "*"
    }
  ]
}
```

## 🏗️ Processo de Deploy

### Passo 1: Setup da Infraestrutura

1. Acesse **Actions** no GitHub
2. Execute o workflow **"Setup AWS Infrastructure"**
3. Escolha o ambiente (`dev` ou `prod`)
4. Aguarde a criação da infraestrutura (~15-20 minutos)

### Passo 2: Deploy da Aplicação

1. Faça push para `main` (produção) ou `develop` (desenvolvimento)
2. O workflow **"Deploy CRM to AWS"** será executado automaticamente
3. Aguarde o build e deploy dos containers (~10-15 minutos)

## 🌐 URLs de Acesso

Após o deploy, as aplicações estarão disponíveis em:

- **Landing Page**: `http://<ALB-DNS-NAME>`
- **API Gateway**: `http://<ALB-DNS-NAME>/api`
- **Backoffice CRM**: `http://<ALB-DNS-NAME>/crm`
- **Swagger Docs**: `http://<ALB-DNS-NAME>/docs`

## 📊 Arquitetura AWS

### Serviços Utilizados

- **ECS Fargate**: Containers dos microserviços
- **RDS PostgreSQL**: Banco principal
- **DocumentDB**: Banco NoSQL para emails
- **Application Load Balancer**: Balanceamento de carga
- **ECR**: Registry de imagens Docker
- **SQS**: Fila de emails
- **SES**: Envio de emails
- **CloudWatch**: Logs e monitoramento
- **VPC**: Rede privada virtual

### Custos Estimados

| Ambiente | Custo Mensal |
|----------|--------------|
| **Desenvolvimento** | ~$180-220 |
| **Produção** | ~$300-500 |

## 🔧 Configuração Avançada

### Variáveis de Ambiente

As seguintes variáveis são configuradas automaticamente:

```bash
# Database
DATABASE_URL=postgres://...
MONGODB_URL=mongodb://...

# AWS Services
AWS_REGION=us-east-1
SQS_QUEUE_URL=https://sqs...
SES_CONFIGURATION_SET=crm-prod

# Services URLs
AUTH_SERVICE_URL=http://crm-auth-prod.crm.local:3050
LEADS_SERVICE_URL=http://crm-leads-prod.crm.local:3020
EMAIL_SERVICE_URL=http://crm-email-prod.crm.local:3040
```

### Secrets Adicionais (Opcionais)

Para funcionalidades completas, configure:

```
GOOGLE_CLIENT_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
```

## 🔄 Workflows Disponíveis

### 1. Setup AWS Infrastructure
- **Trigger**: Manual
- **Função**: Cria toda infraestrutura AWS
- **Tempo**: ~15-20 minutos

### 2. Deploy CRM to AWS
- **Trigger**: Push para `main`/`develop`
- **Função**: Build e deploy da aplicação
- **Tempo**: ~10-15 minutos

## 🛠️ Comandos Úteis

### Verificar Status dos Serviços
```bash
aws ecs list-services --cluster crm-cluster-prod
aws ecs describe-services --cluster crm-cluster-prod --services crm-api-gateway-prod
```

### Ver Logs
```bash
aws logs tail /ecs/crm-prod --follow
```

### Executar Migrações Manualmente
```bash
aws ecs run-task \
  --cluster crm-cluster-prod \
  --task-definition crm-migrate-prod \
  --launch-type FARGATE
```

## 🔍 Troubleshooting

### Problemas Comuns

#### 1. Falha no Build das Imagens
- Verifique se os Dockerfiles estão corretos
- Confirme que as dependências estão instaladas

#### 2. Serviços não Iniciam
- Verifique logs no CloudWatch
- Confirme variáveis de ambiente
- Verifique conectividade com banco

#### 3. Load Balancer não Responde
- Verifique health checks dos target groups
- Confirme security groups
- Verifique se serviços estão rodando

### Logs Importantes

```bash
# Logs do ECS
/ecs/crm-prod

# Logs específicos por serviço
/ecs/crm-prod/api-gateway
/ecs/crm-prod/leads
/ecs/crm-prod/auth
```

## 🔐 Segurança

### Boas Práticas Implementadas

- ✅ VPC com subnets privadas
- ✅ Security Groups restritivos
- ✅ IAM roles com least privilege
- ✅ Encryption em trânsito e repouso
- ✅ Logs centralizados
- ✅ Secrets via AWS Systems Manager

### Melhorias Recomendadas

- [ ] SSL/TLS com certificados
- [ ] WAF para proteção adicional
- [ ] Backup automatizado
- [ ] Monitoramento com alertas
- [ ] Disaster recovery

## 📈 Monitoramento

### Métricas Disponíveis

- CPU e memória dos containers
- Latência do Load Balancer
- Erros HTTP
- Throughput de requests
- Status dos health checks

### Alertas Recomendados

- CPU > 80%
- Memória > 80%
- Erro rate > 5%
- Health check failures

## 🔄 CI/CD Pipeline

### Fluxo Completo

1. **Desenvolvimento**
   - Push para `develop` → Deploy automático para ambiente dev

2. **Produção**
   - Push para `main` → Deploy automático para ambiente prod

3. **Rollback**
   - Revert commit → Deploy automático da versão anterior

### Estratégias de Deploy

- **Blue/Green**: Implementado via ECS service updates
- **Rolling**: Deploy gradual com zero downtime
- **Canary**: Possível com ALB target groups

## 📞 Suporte

### Recursos Úteis

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/)
- [GitHub Actions AWS](https://github.com/aws-actions)

### Comandos de Emergência

```bash
# Parar todos os serviços
aws ecs update-service --cluster crm-cluster-prod --service <service-name> --desired-count 0

# Restaurar serviços
aws ecs update-service --cluster crm-cluster-prod --service <service-name> --desired-count 2

# Destruir infraestrutura (CUIDADO!)
terraform destroy -auto-approve
```

---

**🎯 Resultado Final**: Sistema CRM completo rodando na AWS com alta disponibilidade, escalabilidade e monitoramento integrado!