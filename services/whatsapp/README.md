# 📱 WhatsApp Integration Service

Serviço de integração com WhatsApp Business API para captação e conversão de leads.

## 🚀 Funcionalidades

### ✅ Implementadas
- **Integração Meta WhatsApp Business API** - API oficial do WhatsApp
- **Mock Service** - Para desenvolvimento e testes
- **Mensagens Automáticas** - Boas-vindas, follow-up e qualificação
- **Mensagens Interativas** - Botões e listas para engajamento
- **Webhook de Leads** - Automação baseada em eventos
- **Integração com CRM** - Sincronização com leads e atividades
- **Processamento de Respostas** - Análise automática de mensagens recebidas

### 📋 Tipos de Mensagem
1. **Texto Simples** - Mensagens personalizadas
2. **Templates** - Mensagens pré-aprovadas pelo WhatsApp
3. **Interativas** - Botões e listas para engajamento
4. **Automáticas** - Fluxos baseados em eventos do CRM

## 🔧 Configuração

### Variáveis de Ambiente

```bash
# Porta do serviço
WHATSAPP_PORT=3050

# Modo de operação (true para desenvolvimento)
WHATSAPP_USE_MOCK=true

# Configuração Meta WhatsApp (produção)
WHATSAPP_ACCESS_TOKEN=your-meta-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_VERIFY_TOKEN=quiz-whatsapp-token

# Integração com outros serviços
LEADS_SERVICE_URL=http://leads:3020
```

### Configuração Meta WhatsApp Business

1. **Criar App no Meta for Developers**
   - Acesse https://developers.facebook.com/
   - Crie um novo app Business
   - Adicione o produto WhatsApp Business

2. **Configurar Webhook**
   - URL: `https://seu-dominio.com/webhook`
   - Verify Token: `quiz-whatsapp-token`
   - Campos: `messages`, `message_deliveries`

3. **Obter Credenciais**
   - Access Token (temporário ou permanente)
   - Phone Number ID
   - Webhook Verify Token

## 🏗️ Arquitetura

```
src/
├── domain/           # Entidades e interfaces
├── application/      # Casos de uso
├── infrastructure/   # Implementações externas
└── interfaces/       # Controllers HTTP
```

### Componentes Principais

- **WhatsAppService** - Interface para envio de mensagens
- **MetaWhatsAppService** - Implementação real da API Meta
- **MockWhatsAppService** - Mock para desenvolvimento
- **WhatsAppLeadService** - Integração com leads
- **LeadWebhookService** - Automação de eventos

## 📡 API Endpoints

### Webhook WhatsApp
```http
GET  /webhook                    # Verificação do webhook
POST /webhook                    # Receber mensagens
```

### Envio de Mensagens
```http
POST /send-message               # Mensagem de texto
POST /send-template              # Template aprovado
POST /send-interactive           # Mensagem interativa
```

### Integração com Leads
```http
POST /leads/:id/welcome          # Boas-vindas automáticas
POST /leads/:id/follow-up        # Follow-up personalizado
POST /leads/:id/qualification    # Qualificação interativa
```

### Webhooks Internos
```http
POST /webhook/lead-created       # Novo lead criado
POST /webhook/lead-updated       # Lead atualizado
```

### Desenvolvimento
```http
POST /simulate-incoming          # Simular mensagem recebida
POST /simulate-lead              # Simular novo lead
```

## 🧪 Testes

### Executar Testes de Integração
```bash
# No diretório do serviço WhatsApp
node test-integration.js
```

### Testar Manualmente

1. **Iniciar serviços**
   ```bash
   docker-compose up whatsapp leads
   ```

2. **Testar health check**
   ```bash
   curl http://localhost:3050/health
   ```

3. **Simular novo lead**
   ```bash
   curl -X POST http://localhost:3050/simulate-lead \
     -H "Content-Type: application/json" \
     -d '{
       "id": "test-123",
       "name": "João Silva",
       "phone": "11987654321",
       "email": "joao@email.com"
     }'
   ```

## 🔄 Fluxos Automáticos

### Novo Lead
1. Lead criado na landing page
2. Webhook dispara automaticamente
3. Mensagem de boas-vindas enviada
4. Follow-up agendado para 1 hora

### Qualificação
1. Lead marcado como "hot"
2. Mensagem de qualificação enviada
3. Opções interativas apresentadas
4. Resposta processada automaticamente

### Resposta do Cliente
1. Mensagem recebida via webhook
2. Lead identificado pelo telefone
3. Resposta analisada e categorizada
4. Ação automática executada
5. Atividade registrada no CRM

## 🎯 Templates Sugeridos

### Boas-vindas
```
Olá {{name}}! 👋

Obrigado pelo interesse em nossos serviços financeiros. 

Em breve um especialista entrará em contato para apresentar as melhores soluções para você.

Tem alguma dúvida que posso esclarecer agora?
```

### Follow-up
```
Oi {{name}}! 

Vi que você se interessou pelos nossos serviços. Gostaria de agendar uma conversa rápida para conhecer melhor suas necessidades?

[Botão: Sim, quero agendar]
[Botão: Talvez mais tarde]
[Botão: Não tenho interesse]
```

### Qualificação
```
{{name}}, para oferecer a melhor solução, preciso entender seu perfil.

Qual seu principal interesse?

[Lista: Cartão de Crédito, Empréstimo, Investimentos, Conta Empresarial]
```

## 🚀 Deploy

### Desenvolvimento
```bash
# Usar mock (padrão)
WHATSAPP_USE_MOCK=true docker-compose up whatsapp
```

### Produção
```bash
# Configurar variáveis reais
WHATSAPP_USE_MOCK=false
WHATSAPP_ACCESS_TOKEN=your-token
WHATSAPP_PHONE_NUMBER_ID=your-id

docker-compose up whatsapp
```

## 📊 Monitoramento

### Logs Importantes
- ✅ Mensagens enviadas com sucesso
- ❌ Falhas no envio
- 📱 Mensagens recebidas
- 🔄 Webhooks processados
- 🎯 Leads processados

### Métricas Sugeridas
- Taxa de entrega de mensagens
- Taxa de resposta dos leads
- Tempo de resposta automática
- Conversão por canal WhatsApp

## 🔒 Segurança

- Verificação de webhook token
- Validação de origem das mensagens
- Rate limiting (implementar se necessário)
- Logs de auditoria
- Sanitização de dados de entrada

## 🤝 Integração com CRM

O serviço se integra automaticamente com:
- **Leads Service** - Busca e atualização de leads
- **Activities** - Registro de interações
- **API Gateway** - Autenticação e roteamento
- **Email Service** - Notificações complementares