# 🏦 CRM Fintech - Especificação Completa do Projeto

## 📋 Visão Geral

Sistema CRM moderno para fintechs com capturação de leads, gestão de pipeline e autenticação JWT, implementado com arquitetura hexagonal e microserviços.

## 🏗️ Arquitetura do Sistema

### Estrutura de Microserviços
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Landing Page  │    │  Backoffice CRM │    │   API Gateway   │
│   (React)       │    │   (React)       │    │   (Fastify)     │
│   Port: 3010    │    │   Port: 3030    │    │   Port: 3000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐    ┌─────────────────┐
                    │  Leads Service  │    │  Auth Service   │
                    │   (Fastify)     │    │   (Fastify)     │
                    │   Port: 3020    │    │   Port: 3050    │
                    └─────────────────┘    └─────────────────┘
                                 │                       │
                                 └───────────────────────┘
                                           │
                                ┌─────────────────┐
                                │   PostgreSQL    │
                                │   Port: 5432    │
                                └─────────────────┘
```

### Serviços Implementados

1. **API Gateway** (`services/api-gateway`)
   - Gateway central para todas as APIs
   - Autenticação OAuth2 com JWT
   - Roteamento e proxy para microserviços
   - Documentação Swagger integrada

2. **Landing Page** (`services/landing-react`)
   - Página de captura de leads
   - Formulário multi-step com validações
   - Integração com Google Sign-In
   - Interface responsiva com React + MUI

3. **Leads Service** (`services/leads`)
   - Core do CRM com gestão de leads
   - Pipeline de vendas
   - Sistema de atividades
   - Banco de dados PostgreSQL

4. **Backoffice React** (`services/backoffice-react`)
   - Dashboard administrativo
   - Gestão completa de leads
   - Pipeline visual (Kanban)
   - Relatórios e métricas

5. **Auth Service** (`services/auth`)
   - Autenticação JWT
   - OAuth2 Client Credentials
   - Controle de escopos de acesso

## 🗄️ Modelo de Dados

### Tabelas Principais

#### `leads`
```sql
- id (UUID, PK)
- name (VARCHAR, NOT NULL)
- email (VARCHAR, UNIQUE, NOT NULL)
- phone (VARCHAR)
- cpf (VARCHAR, UNIQUE)
- birth_date (DATE)
- company (VARCHAR)
- job_title (VARCHAR)
- lead_value (DECIMAL)
- expected_close_date (DATE)
- priority (ENUM: low, medium, high, urgent)
- temperature (ENUM: cold, warm, hot)
- assigned_to (VARCHAR)
- next_follow_up (TIMESTAMP)
- source (VARCHAR)
- status (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `stages`
```sql
- id (UUID, PK)
- name (VARCHAR, NOT NULL)
- order_index (INTEGER)
- color (VARCHAR)
- created_at (TIMESTAMP)
```

#### `activities`
```sql
- id (UUID, PK)
- lead_id (UUID, FK)
- type (ENUM: call, email, meeting, note, task)
- description (TEXT)
- duration (INTEGER)
- outcome (TEXT)
- next_action (TEXT)
- created_at (TIMESTAMP)
- created_by (VARCHAR)
```

#### `lead_pipeline`
```sql
- id (UUID, PK)
- lead_id (UUID, FK)
- current_stage_id (UUID, FK)
- entered_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## 🚀 Funcionalidades Implementadas

### 📋 Formulário de Cadastro (Landing Page)
- **Campos Básicos**: Nome, email, telefone, CPF, data de nascimento
- **Informações Comerciais**: Empresa, cargo, valor estimado, data de fechamento
- **Endereço Completo**: CEP, logradouro, número, complemento, bairro, cidade, estado
- **Validações**: CPF, telefone, CEP, email com feedback em tempo real
- **Multi-step Form**: Experiência dividida em etapas
- **Google Sign-In**: Integração para cadastro rápido

### 🎯 Pipeline Visual (Estilo Pipefy)
- **Kanban Board**: Visualização em colunas dos estágios
- **Cards de Lead**: Informações completas em cards visuais
- **Drag & Drop**: Movimentação entre estágios (preparado)
- **Cores por Estágio**: Identificação visual clara
- **Estágios Padrão**: Novo → Qualificado → Proposta → Negociação → Fechado

### 📊 Dashboard CRM Avançado
- **Métricas Principais**:
  - Total de leads
  - Valor total do pipeline
  - Leads prioritários
  - Follow-ups do dia
- **Gráficos Visuais**:
  - Distribuição por temperatura
  - Top 5 leads por valor
  - Leads por dia da semana
- **Atualização em Tempo Real**: Refresh automático a cada 30s

### 📝 Gestão Completa de Leads
- **Lista Avançada**: Tabela com filtros e busca
- **Filtros Disponíveis**:
  - Busca por nome, email, empresa
  - Filtro por prioridade
  - Filtro por estágio
- **CRUD Completo**: Criação, edição, visualização e exclusão
- **Formulário Detalhado**: Todos os campos do modelo de dados

### 🎯 Sistema de Atividades
- **Tipos**: Ligação, email, reunião, anotação, tarefa
- **Campos Detalhados**:
  - Descrição da atividade
  - Duração (para ligações e reuniões)
  - Resultado/Outcome
  - Próxima ação necessária
- **Histórico Completo**: Rastreamento de todas as interações

## 🔐 Segurança e Autenticação

### OAuth2 Client Credentials
- **Escopos Implementados**:
  - `leads:read` - Leitura de leads
  - `leads:write` - Criação/edição de leads
  - `reports:read` - Acesso a relatórios
  - `api:read` - Rotas seguras do API Gateway

### Clientes OAuth2
```env
AUTH_CLIENTS=frontend:front-secret:leads:read,leads:write,reports:read;gateway:gateway-secret:leads:read,leads:write,api:read
```

### Credenciais de Teste
- **Admin**: `admin@quiz.com` / `admin123`
- **User**: `user@quiz.com` / `user123`
- **Token Mock**: `mock-admin-token` (desenvolvimento)

## 🛠️ Stack Tecnológica

### Frontend
- **React 18** com TypeScript
- **Material-UI (MUI)** para componentes
- **React Hook Form** para formulários
- **Zod** para validação
- **TanStack Query** para gerenciamento de estado
- **Vite** para build e desenvolvimento

### Backend
- **Fastify** para APIs
- **PostgreSQL** para banco de dados
- **JWT** para autenticação
- **Docker** para containerização
- **Swagger/OpenAPI** para documentação

### Infraestrutura
- **Docker Compose** para desenvolvimento
- **Kubernetes** com Kustomize para produção
- **NGINX** como proxy reverso
- **Ingress Controller** para roteamento

## 🚀 Instalação e Execução

### Pré-requisitos
- Node.js 20.12.2+
- Docker e Docker Compose
- Git

### Início Rápido

#### Windows
```bash
start-crm.bat
```

#### Linux/Mac
```bash
chmod +x start-system.sh
./start-system.sh
```

### URLs do Sistema
| Serviço | URL | Descrição |
|---------|-----|-----------|
| **Landing Page** | http://localhost:3010 | Captura de leads |
| **Backoffice CRM** | http://localhost:3030 | Dashboard administrativo |
| **API Gateway** | http://localhost:3000 | Gateway principal |
| **Swagger Docs** | http://localhost:3000/docs | Documentação da API |
| **Auth Service** | http://localhost:3050 | Autenticação |
| **Leads Service** | http://localhost:3020 | Core CRM |

### Configuração de Ambiente

#### Arquivo `.env`
```env
# Database
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=quiz
POSTGRES_USER=quiz
POSTGRES_PASSWORD=quiz
DATABASE_URL=postgres://quiz:quiz@db:5432/quiz

# Auth
AUTH_JWT_SECRET=your-super-secret-jwt-key-here
AUTH_CLIENTS=frontend:front-secret:leads:read,leads:write,reports:read;gateway:gateway-secret:leads:read,leads:write,api:read

# Google OAuth (opcional)
GOOGLE_CLIENT_ID=your-google-client-id

# Ports
API_GATEWAY_PORT=3000
LANDING_PORT=3010
BACKOFFICE_PORT=3030
LEADS_PORT=3020
AUTH_PORT=3050
POSTGRES_PORT=5432
```

## 🐳 Docker e Kubernetes

### Docker Compose (Desenvolvimento)
```bash
# Iniciar todos os serviços
docker compose up --build

# Apenas banco de dados
docker compose up db

# Executar migrações
docker compose run --rm leads-migrate

# Parar sistema
docker compose down
```

### Kubernetes (Produção)
```bash
# Aplicar manifests base
kubectl apply -k k8s/base

# Aplicar overlay de desenvolvimento
kubectl apply -k k8s/dev

# Verificar status
kubectl get pods -n quiz
```

### Build de Imagens
```bash
# Por serviço
docker build -t <registry>/quiz-<nome-servico>:latest services/<nome-servico>

# Exemplo para todos os serviços
docker build -t quiz-api-gateway services/api-gateway
docker build -t quiz-landing services/landing-react
docker build -t quiz-backoffice services/backoffice-react
docker build -t quiz-leads services/leads
docker build -t quiz-auth services/auth
```

## 🧪 Testes e Validação

### Fluxo de Teste Completo

1. **Captura de Lead** (Landing Page)
   - Acesse http://localhost:3010
   - Preencha formulário multi-step
   - Teste validações (CPF, email, telefone)
   - Verifique Google Sign-In

2. **Gestão CRM** (Backoffice)
   - Acesse http://localhost:3030
   - Login: admin@quiz.com / admin123
   - Visualize dashboard com métricas
   - Gerencie leads no pipeline
   - Adicione atividades

3. **Validação de APIs**
   ```bash
   # Health checks
   curl http://localhost:3000/health
   curl http://localhost:3020/health
   curl http://localhost:3050/health
   
   # Autenticação
   curl -X POST http://localhost:3050/oauth/token \
     -H "Content-Type: application/json" \
     -d '{"client_id":"gateway","client_secret":"gateway-secret","grant_type":"client_credentials","scope":"leads:read"}'
   
   # Leads
   curl http://localhost:3000/backoffice/leads \
     -H "Authorization: Bearer <token>"
   ```

### Scripts de Teste
- `test-login-and-leads.bat` - Teste completo do sistema
- `status-crm.bat` - Verificação de status dos serviços
- `check-health.bat` - Health check de todos os endpoints

## 🔧 Troubleshooting

### Problemas Comuns

#### Erro de Conexão PostgreSQL
```bash
# Verificar se banco está rodando
docker compose ps

# Ver logs do banco
docker compose logs db

# Reiniciar banco
docker compose restart db

# Limpar volumes e reiniciar
docker compose down --volumes
start-crm.bat
```

#### Porta em Uso
```bash
# Windows - verificar processo
netstat -ano | findstr :3030
taskkill /PID <PID> /F

# Alterar porta no .env se necessário
```

#### Serviço não Responde
```bash
# Ver logs específicos
docker compose logs api-gateway
docker compose logs leads
docker compose logs auth

# Reiniciar serviço específico
docker compose restart <serviço>
```

### Logs Úteis
```bash
# Todos os logs
docker compose logs -f

# Logs específicos
docker compose logs -f api-gateway
docker compose logs -f leads
docker compose logs -f db
```

## 📊 Métricas e Monitoramento

### Health Checks Implementados
- `/health` em todos os serviços
- Verificação de conectividade com banco
- Status de dependências externas

### Métricas do Dashboard
- Total de leads cadastrados
- Valor total do pipeline
- Leads por prioridade
- Follow-ups pendentes
- Distribuição por temperatura
- Conversão por estágio

## 🔮 Roadmap e Próximas Funcionalidades

### Curto Prazo
- [ ] Drag & drop funcional no pipeline
- [ ] Notificações em tempo real
- [ ] Relatórios avançados
- [ ] Integração WhatsApp/SMS

### Médio Prazo
- [ ] Automação de marketing
- [ ] Lead scoring automático
- [ ] Templates de email
- [ ] Integração com telefonia

### Longo Prazo
- [ ] Inteligência artificial
- [ ] App mobile nativo
- [ ] Análise de sentimento
- [ ] Integração com ERPs

## 📚 Documentação Adicional

### Arquitetura Hexagonal
Cada serviço segue o padrão hexagonal:
- **Domain**: Entidades e regras de negócio
- **Application**: Casos de uso
- **Interfaces**: Portas de entrada (HTTP)
- **Infrastructure**: Adapters (DB, integrações)

### Swagger/OpenAPI
- API Gateway: http://localhost:3000/docs
- Leads Service: http://localhost:3020/docs
- Documentação JSON disponível em `/docs/json`

### Demo Interativo
- Arquivo: `docs/demo.html`
- Apresentação completa das funcionalidades
- Dados de exemplo e animações

## 🎯 Benefícios Implementados

- ✅ **Captura Otimizada**: Formulário multi-step com validações
- ✅ **Pipeline Visual**: Gestão clara do funil de vendas
- ✅ **Métricas em Tempo Real**: KPIs essenciais para tomada de decisão
- ✅ **Arquitetura Escalável**: Microserviços com Docker/Kubernetes
- ✅ **UX Moderna**: Interface intuitiva e responsiva
- ✅ **Segurança Robusta**: Autenticação JWT e controle de acesso
- ✅ **Documentação Completa**: APIs documentadas com Swagger
- ✅ **Ambiente de Desenvolvimento**: Setup automatizado com scripts

## 📞 Suporte e Manutenção

### Comandos de Manutenção
```bash
# Backup do banco
docker compose exec db pg_dump -U quiz quiz > backup.sql

# Restaurar backup
docker compose exec -T db psql -U quiz quiz < backup.sql

# Limpar sistema
docker compose down --volumes --rmi all
docker system prune -a
```

### Monitoramento de Produção
- Health checks configurados
- Logs centralizados
- Métricas de performance
- Alertas automáticos

---

**Versão**: 1.0.0  
**Última Atualização**: 2024  
**Ambiente**: Desenvolvimento e Produção  
**Status**: ✅ Funcional e Testado