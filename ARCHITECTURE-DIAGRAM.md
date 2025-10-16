# 🏗️ Diagrama de Arquitetura do CRM

## Arquitetura Geral do Sistema

```mermaid
graph TB
    subgraph "Frontend Layer"
        LP[Landing Page<br/>React + Vite<br/>:3010]
        BO[Backoffice<br/>React + Material-UI<br/>:3030]
    end
    
    subgraph "API Layer"
        GW[API Gateway<br/>Fastify + JWT<br/>:3000]
    end
    
    subgraph "Business Services"
        AUTH[Auth Service<br/>OAuth2 + JWT<br/>:3050]
        LEADS[Leads Service<br/>PostgreSQL<br/>:3020]
        EMAIL[Email Service<br/>MongoDB + SQS + SES<br/>:3040]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Leads & Activities)]
        MONGO[(MongoDB<br/>Email Tracking)]
    end
    
    subgraph "External Services"
        SQS[AWS SQS<br/>Email Queue]
        SES[AWS SES<br/>Email Delivery]
    end
    
    LP --> GW
    BO --> GW
    GW --> AUTH
    GW --> LEADS
    GW --> EMAIL
    LEADS --> PG
    EMAIL --> MONGO
    EMAIL --> SQS
    EMAIL --> SES
    
    classDef frontend fill:#e1f5fe
    classDef api fill:#f3e5f5
    classDef service fill:#e8f5e8
    classDef data fill:#fff3e0
    classDef external fill:#ffebee
    
    class LP,BO frontend
    class GW api
    class AUTH,LEADS,EMAIL service
    class PG,MONGO data
    class SQS,SES external
```

## Arquitetura Hexagonal do Email Service

```mermaid
graph TB
    subgraph "External Actors"
        HTTP[HTTP Clients]
        CRON[Cron Jobs]
    end
    
    subgraph "Interfaces (Adapters)"
        REST[REST API<br/>Fastify Routes]
        PROC[Queue Processor<br/>Background Job]
    end
    
    subgraph "Application Layer"
        SEND[SendEmailUseCase]
        PROCESS[ProcessEmailQueueUseCase]
    end
    
    subgraph "Domain Layer"
        EMAIL_ENT[Email Entity]
        EMAIL_REPO[EmailRepository<br/>Interface]
        EMAIL_PROV[EmailProvider<br/>Interface]
        MSG_QUEUE[MessageQueue<br/>Interface]
    end
    
    subgraph "Infrastructure (Adapters)"
        MONGO_REPO[MongoEmailRepository]
        SES_PROV[SESEmailProvider]
        SQS_QUEUE[SQSMessageQueue]
    end
    
    subgraph "External Systems"
        MONGODB[(MongoDB)]
        AWS_SES[AWS SES]
        AWS_SQS[AWS SQS]
    end
    
    HTTP --> REST
    CRON --> PROC
    REST --> SEND
    PROC --> PROCESS
    SEND --> EMAIL_ENT
    SEND --> EMAIL_REPO
    SEND --> MSG_QUEUE
    PROCESS --> EMAIL_ENT
    PROCESS --> EMAIL_REPO
    PROCESS --> EMAIL_PROV
    PROCESS --> MSG_QUEUE
    EMAIL_REPO -.-> MONGO_REPO
    EMAIL_PROV -.-> SES_PROV
    MSG_QUEUE -.-> SQS_QUEUE
    MONGO_REPO --> MONGODB
    SES_PROV --> AWS_SES
    SQS_QUEUE --> AWS_SQS
    
    classDef external fill:#ffebee
    classDef interface fill:#e3f2fd
    classDef application fill:#e8f5e8
    classDef domain fill:#fff3e0
    classDef infrastructure fill:#f3e5f5
    
    class HTTP,CRON external
    class REST,PROC interface
    class SEND,PROCESS application
    class EMAIL_ENT,EMAIL_REPO,EMAIL_PROV,MSG_QUEUE domain
    class MONGO_REPO,SES_PROV,SQS_QUEUE infrastructure
```

## Fluxo de Dados - Envio de Email

```mermaid
sequenceDiagram
    participant User as 👤 Usuário
    participant BO as 🖥️ Backoffice
    participant GW as 🌐 API Gateway
    participant ES as 📧 Email Service
    participant SQS as 📬 AWS SQS
    participant SES as 📮 AWS SES
    participant DB as 🗄️ MongoDB
    
    User->>BO: Criar atividade email
    BO->>GW: POST /backoffice/activities
    GW->>ES: POST /emails
    
    ES->>DB: Salvar email (status: pending)
    ES->>SQS: Enviar mensagem para fila
    ES-->>GW: { emailId, status: "queued" }
    GW-->>BO: Atividade criada
    BO-->>User: Email agendado
    
    Note over ES: Background Processor
    ES->>SQS: Consumir mensagem
    ES->>DB: Buscar email por ID
    ES->>SES: Enviar email
    SES-->>ES: MessageId
    ES->>DB: Atualizar status (sent)
    ES->>SQS: Deletar mensagem
```

## Estrutura de Dados

### PostgreSQL (Leads Service)
```sql
-- Leads principais
leads (
  id UUID PRIMARY KEY,
  name TEXT,
  email TEXT,
  company TEXT,
  status TEXT,
  created_at TIMESTAMP
)

-- Atividades dos leads
activities (
  id UUID PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  type TEXT, -- call, email, meeting
  description TEXT,
  outcome TEXT,
  created_at TIMESTAMP
)

-- Pipeline de vendas
stages (
  id UUID PRIMARY KEY,
  name TEXT,
  order_no INTEGER
)
```

### MongoDB (Email Service)
```javascript
// Coleção de emails
{
  _id: "uuid",
  from: { email: "sender@crm.com", name: "CRM" },
  to: [{ email: "lead@company.com", name: "Lead" }],
  subject: "Assunto",
  htmlBody: "<html>...</html>",
  textBody: "Texto...",
  status: "sent", // pending, sent, delivered, failed
  leadId: "uuid-do-lead",
  campaignId: "uuid-da-campanha",
  priority: "normal", // low, normal, high
  createdAt: ISODate(),
  sentAt: ISODate(),
  deliveredAt: ISODate(),
  sesMessageId: "aws-ses-message-id",
  retryCount: 0,
  errorMessage: null
}
```

## Padrões de Design Aplicados

### 1. Repository Pattern
```typescript
interface EmailRepository {
  save(email: Email): Promise<void>
  findById(id: string): Promise<Email | null>
  update(email: Email): Promise<void>
}
```

### 2. Strategy Pattern
```typescript
interface EmailProvider {
  sendEmail(email: Email): Promise<string>
}

class SESEmailProvider implements EmailProvider { ... }
class SMTPEmailProvider implements EmailProvider { ... }
```

### 3. Command Pattern
```typescript
class SendEmailCommand {
  constructor(private useCase: SendEmailUseCase) {}
  
  async execute(request: SendEmailRequest): Promise<string> {
    return this.useCase.execute(request)
  }
}
```

### 4. Observer Pattern
```typescript
class EmailEventPublisher {
  private observers: EmailObserver[] = []
  
  notify(event: EmailEvent): void {
    this.observers.forEach(observer => observer.handle(event))
  }
}
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Docker Compose"
        subgraph "Web Services"
            LP_C[landing:3010]
            BO_C[backoffice:3030]
            GW_C[api-gateway:3000]
        end
        
        subgraph "Business Services"
            AUTH_C[auth:3050]
            LEADS_C[leads:3020]
            EMAIL_C[email:3040]
        end
        
        subgraph "Databases"
            PG_C[postgres:5432]
            MONGO_C[mongo:27017]
        end
    end
    
    subgraph "AWS Cloud"
        SQS_AWS[SQS Queue]
        SES_AWS[SES Service]
    end
    
    LP_C --> GW_C
    BO_C --> GW_C
    GW_C --> AUTH_C
    GW_C --> LEADS_C
    GW_C --> EMAIL_C
    LEADS_C --> PG_C
    EMAIL_C --> MONGO_C
    EMAIL_C --> SQS_AWS
    EMAIL_C --> SES_AWS
    
    classDef web fill:#e1f5fe
    classDef service fill:#e8f5e8
    classDef db fill:#fff3e0
    classDef aws fill:#ffebee
    
    class LP_C,BO_C,GW_C web
    class AUTH_C,LEADS_C,EMAIL_C service
    class PG_C,MONGO_C db
    class SQS_AWS,SES_AWS aws
```

## Escalabilidade e Performance

### Horizontal Scaling
```mermaid
graph TB
    subgraph "Load Balancer"
        LB[Nginx/ALB]
    end
    
    subgraph "API Gateway Cluster"
        GW1[Gateway 1]
        GW2[Gateway 2]
        GW3[Gateway N]
    end
    
    subgraph "Email Service Cluster"
        ES1[Email Service 1]
        ES2[Email Service 2]
        ES3[Email Service N]
    end
    
    subgraph "Queue Processing"
        SQS[AWS SQS<br/>Multiple Queues]
    end
    
    subgraph "Databases"
        PG_MASTER[(PostgreSQL Master)]
        PG_REPLICA[(PostgreSQL Replica)]
        MONGO_CLUSTER[(MongoDB Cluster)]
    end
    
    LB --> GW1
    LB --> GW2
    LB --> GW3
    
    GW1 --> ES1
    GW2 --> ES2
    GW3 --> ES3
    
    ES1 --> SQS
    ES2 --> SQS
    ES3 --> SQS
    
    ES1 --> MONGO_CLUSTER
    ES2 --> MONGO_CLUSTER
    ES3 --> MONGO_CLUSTER
    
    GW1 --> PG_MASTER
    GW2 --> PG_REPLICA
    GW3 --> PG_REPLICA
```

## Monitoramento e Observabilidade

### Métricas Principais
- **Email Service**: Taxa de envio, falhas, latência
- **SQS**: Mensagens na fila, tempo de processamento
- **SES**: Bounces, complaints, deliverability
- **MongoDB**: Conexões, operações, latência

### Logs Estruturados
```json
{
  "timestamp": "2024-01-01T10:00:00Z",
  "service": "email-service",
  "level": "info",
  "message": "Email sent successfully",
  "emailId": "uuid",
  "leadId": "uuid",
  "sesMessageId": "aws-id",
  "duration": 150
}
```

### Health Checks
- `/health` - Status geral do serviço
- Verificação de conectividade com MongoDB
- Verificação de conectividade com SQS
- Verificação de conectividade com SES

## Segurança

### Autenticação e Autorização
- JWT tokens para autenticação
- Scopes para autorização granular
- Rate limiting por usuário/IP

### Dados Sensíveis
- Emails criptografados em repouso
- Logs sem informações pessoais
- Retenção limitada de dados

### AWS Security
- IAM roles com permissões mínimas
- VPC para isolamento de rede
- Encryption in transit e at rest