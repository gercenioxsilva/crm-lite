# 📋 Context e Histórico Completo - CRM Fintech

## 🏗️ Arquitetura do Sistema

### Microserviços Implementados
- **API Gateway** (3000) - Roteamento e autenticação
- **Auth Service** (3050) - Autenticação JWT + Google OAuth
- **Leads Service** (3020) - Gestão de leads e pipeline
- **Email Service** (3040) - Envio assíncrono via AWS SES/SQS
- **WhatsApp Service** (3050) - Integração Meta WhatsApp Business API
- **Landing React** (3010) - Página de captura de leads
- **Backoffice React** (3030) - Dashboard administrativo

### Tecnologias
- **Backend**: Node.js + TypeScript + Express
- **Frontend**: React + TypeScript + Tailwind CSS
- **Banco**: SQLite (desenvolvimento) / PostgreSQL (produção)
- **Cloud**: AWS (ECS, ECR, SES, SQS, ALB, VPC)
- **IaC**: Terraform
- **CI/CD**: GitHub Actions

## 🚀 Deploy e Infraestrutura

### Status Atual do Deploy AWS
- ✅ ECR Registry: `016054712606.dkr.ecr.us-east-1.amazonaws.com`
- ✅ Repositórios ECR criados automaticamente
- ✅ Imagens Docker buildadas e enviadas
- ✅ Terraform configurado com backend S3
- ✅ Bucket S3: `crm-terraform-state-us-east-1`
- 🔄 **Em andamento**: Deploy da infraestrutura ECS

### Correções Realizadas no Deploy
1. **ECR_REGISTRY vazio** → Obtém AWS Account ID automaticamente
2. **Repositórios ECR inexistentes** → Criação automática
3. **npm ci sem package-lock.json** → Alterado para npm install
4. **Erro TypeScript MockWhatsApp** → Corrigido tipo do status
5. **Terraform não instalado** → Adicionado setup-terraform action
6. **Backend S3 região errada** → Bucket criado em us-east-1
7. **Argumentos inválidos Terraform** → Removido health_check_grace_period_seconds

### Workflow GitHub Actions
```yaml
# Principais steps:
- Setup Terraform v1.5.0
- Create ECR repositories
- Build and push Docker images
- Deploy infrastructure with Terraform
- Update ECS services
```

## 📁 Estrutura do Projeto

```
crm-lite/
├── services/
│   ├── api-gateway/     # Roteamento principal
│   ├── auth/           # Autenticação JWT/OAuth
│   ├── leads/          # Gestão de leads
│   ├── email/          # Serviço de email
│   ├── whatsapp/       # Integração WhatsApp
│   ├── landing-react/  # Landing page
│   └── backoffice-react/ # Dashboard admin
├── terraform/          # Infraestrutura como código
├── .github/workflows/  # CI/CD pipelines
├── scripts/           # Scripts de automação
└── docs/             # Documentação
```

## 🔑 Funcionalidades Implementadas

### Captura de Leads
- ✅ Formulário na landing page
- ✅ Validação e sanitização
- ✅ Integração Google OAuth
- ✅ Armazenamento no banco
- ✅ Notificações automáticas

### Gestão de Pipeline
- ✅ CRUD completo de leads
- ✅ Status: novo, qualificado, proposta, fechado, perdido
- ✅ Atividades e histórico
- ✅ Dashboard com métricas
- ✅ Filtros e busca

### Comunicação Automatizada
- ✅ Email via AWS SES com retry
- ✅ WhatsApp via Meta Business API
- ✅ Templates personalizáveis
- ✅ Tracking de status
- ✅ Fila de processamento (SQS)

### Autenticação e Segurança
- ✅ JWT tokens
- ✅ Google OAuth 2.0
- ✅ Middleware de autenticação
- ✅ Validação de permissões
- ✅ Rate limiting

## 🔧 Comandos Essenciais

### Desenvolvimento Local
```bash
start-crm.bat          # Iniciar todos os serviços
stop-crm.bat           # Parar sistema
status-crm.bat         # Verificar status
troubleshoot-crm.bat   # Diagnóstico
```

### Deploy AWS
```bash
git push origin main   # Trigger deploy automático
```

### Credenciais de Teste
- **Email**: admin@quiz.com
- **Senha**: admin123
- **Token Mock**: mock-admin-token

## 🌐 URLs de Acesso

### Desenvolvimento
- Landing: http://localhost:3010
- CRM: http://localhost:3030
- API Gateway: http://localhost:3000
- Email Service: http://localhost:3040
- WhatsApp Service: http://localhost:3050

### Produção (AWS)
- 🔄 **Em configuração**: URLs serão definidas após deploy completo

## 📊 Próximos Passos

### Deploy AWS
1. ✅ Corrigir erros Terraform
2. 🔄 Finalizar deploy ECS
3. ⏳ Configurar domínio e SSL
4. ⏳ Configurar variáveis de ambiente
5. ⏳ Testes de integração

### Funcionalidades Futuras
- Dashboard analytics avançado
- Integração CRM externo
- API webhooks
- Relatórios automatizados
- Multi-tenancy

## 🐛 Problemas Conhecidos

### Resolvidos
- ✅ ECR registry configuration
- ✅ Docker build issues
- ✅ Terraform backend S3
- ✅ Service discovery arguments

### Em Monitoramento
- 🔍 Performance do banco SQLite
- 🔍 Rate limits AWS SES
- 🔍 Timeout WhatsApp API

## 📝 Commits Recentes

```
226045e - fix: remove argumentos inválidos dos recursos aws_service_discovery_service
7201c3c - fix: cria bucket S3 automaticamente para Terraform state
279c694 - fix: corrige região do backend S3 do Terraform para eu-central-1
a0565c7 - fix: adiciona instalação do Terraform no workflow
40d31e6 - fix: corrige erro TypeScript no MockWhatsAppService
3c70dbe - fix: corrige Dockerfile do WhatsApp para usar npm install
52908c6 - fix: adiciona criação automática de repositórios ECR
da699a2 - fix: corrige ECR_REGISTRY obtendo AWS Account ID automaticamente
```

## 🔗 Documentação Relacionada

- [README.md](README.md) - Guia de início rápido
- [ESPECIFICACAO-COMPLETA.md](ESPECIFICACAO-COMPLETA.md) - Especificações técnicas
- [EMAIL-SERVICE.md](EMAIL-SERVICE.md) - Documentação do serviço de email
- [GITHUB-SECRETS.md](GITHUB-SECRETS.md) - Configuração de secrets
- [ARCHITECTURE-DIAGRAM.md](ARCHITECTURE-DIAGRAM.md) - Diagramas de arquitetura

---

**Última atualização**: Deploy AWS em andamento - Terraform configurado e pronto para infraestrutura ECS