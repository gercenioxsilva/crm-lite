# 🏦 CRM Fintech - Sistema Completo de Gestão de Leads

Sistema CRM moderno para fintechs com capturação de leads, gestão de pipeline e autenticação JWT.

## 🚀 Início Rápido

**Windows:**
```bash
start-crm.bat
```

**Linux/Mac:**
```bash
chmod +x start-system.sh
./start-system.sh
```

**URLs:**
- Landing: http://localhost:3010
- CRM: http://localhost:3030 (admin@quiz.com / admin123)
- Email Service: http://localhost:3040
- WhatsApp Service: http://localhost:3050

## 📚 Documentação Completa

Para especificações detalhadas, arquitetura, instalação e troubleshooting, consulte:

**[📋 ESPECIFICAÇÃO COMPLETA](ESPECIFICACAO-COMPLETA.md)**
**[📧 SERVIÇO DE EMAIL](EMAIL-SERVICE.md)**
**[🏗️ DIAGRAMAS DE ARQUITETURA](ARCHITECTURE-DIAGRAM.md)**

Estes documentos contêm todas as informações necessárias sobre:
- Arquitetura e estrutura do sistema
- Modelo de dados completo
- Funcionalidades implementadas
- Serviço de email com SQS e SES
- Guia de instalação e configuração
- Troubleshooting e soluções
- Roadmap e próximas funcionalidades

## ⚡ Comandos Essenciais

```bash
start-crm.bat          # Iniciar sistema completo
stop-crm.bat           # Parar sistema com opções
status-crm.bat         # Verificar status e interagir
troubleshoot-crm.bat   # Diagnóstico e correções
```

## 🔑 Credenciais de Teste

- **Email**: admin@quiz.com
- **Senha**: admin123
- **Token Mock**: mock-admin-token

## 🆕 Novo: Serviço de Email

### Funcionalidades
- ✅ Envio assíncrono via AWS SES
- ✅ Fila de processamento com AWS SQS
- ✅ Retry automático com backoff exponencial
- ✅ Tracking de status (enviado, entregue, falhou)
- ✅ Integração com leads e atividades
- ✅ Arquitetura hexagonal com DDD
- ✅ Banco NoSQL (MongoDB) para controle

## 📱 Novo: Integração WhatsApp

### Funcionalidades
- ✅ Integração com Meta WhatsApp Business API
- ✅ Mensagens automáticas de boas-vindas
- ✅ Follow-up personalizado para leads
- ✅ Mensagens interativas (botões e listas)
- ✅ Qualificação automática de leads
- ✅ Processamento de respostas recebidas
- ✅ Mock service para desenvolvimento
- ✅ Webhook para automação de fluxos
- ✅ Integração completa com CRM

### Configuração AWS
```bash
# Configurar credenciais AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/account/queue
```

### Configuração WhatsApp
```bash
# Para desenvolvimento (usa mock)
WHATSAPP_USE_MOCK=true

# Para produção (Meta WhatsApp Business API)
WHATSAPP_USE_MOCK=false
WHATSAPP_ACCESS_TOKEN=your-meta-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_VERIFY_TOKEN=quiz-whatsapp-token
```

### Teste da Integração WhatsApp
```bash
# Executar testes de integração
cd services/whatsapp
node test-integration.js
```