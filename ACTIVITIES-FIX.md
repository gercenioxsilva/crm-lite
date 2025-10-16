# 🔧 Fix para Funcionalidade de Atividades

## Problema Identificado

A funcionalidade de inclusão de atividades no backoffice não estava funcionando devido a:

1. **Incompatibilidade de campos**: O frontend enviava campos diferentes dos esperados pelo backend
2. **Falta de endpoint**: Não havia endpoint para listar atividades no API Gateway
3. **Estrutura da tabela**: Campos obrigatórios não existiam na tabela `activities`

## Soluções Implementadas

### 1. Correção da Tabela de Atividades

**Arquivo**: `services/leads/db/migrations/0006_fix_activities_table.sql`

- Adicionados campos faltantes: `duration_minutes`, `follow_up_required`, `next_action`
- Criados índices para melhor performance
- Adicionadas constraints para validação de dados
- Atualização de dados existentes com valores padrão

### 2. Correção do Backend (Leads Service)

**Arquivo**: `services/leads/src/interfaces/http/routes.ts`

- Corrigido endpoint `/activities` para aceitar todos os campos necessários
- Adicionado endpoint `/activities` GET para listar atividades
- Melhorado tratamento de erros
- Adicionados endpoints para atualização de leads e movimentação no pipeline

### 3. Correção do API Gateway

**Arquivo**: `services/api-gateway/src/interfaces/http/routes.ts`

- Adicionado endpoint `GET /backoffice/activities` 
- Melhorado tratamento de erros em todos os endpoints
- Correção do mapeamento de campos entre frontend e backend

### 4. Correção do Frontend

**Arquivo**: `services/backoffice-react/src/components/ActivitiesManager.tsx`

- Corrigida URL para buscar atividades
- Adicionada validação antes de criar atividade
- Melhorado tratamento de erros
- Adicionado estado vazio quando não há atividades
- Adicionado tipo "WhatsApp" nas atividades

## Como Aplicar as Correções

### 1. Executar Migração do Banco

```bash
# Opção 1: Usar o script criado
run-migration.bat

# Opção 2: Executar manualmente
docker exec -i crm-lite-db-1 psql -U quiz -d quiz < services/leads/db/migrations/0006_fix_activities_table.sql
```

### 2. Reiniciar os Serviços

```bash
# Parar o sistema
stop-crm.bat

# Iniciar novamente
start-crm.bat
```

### 3. Testar a Funcionalidade

```bash
# Usar o script de teste
test-activities.bat

# Ou testar manualmente no navegador
# 1. Acesse http://localhost:3030
# 2. Faça login (admin@quiz.com / admin123)
# 3. Vá para "Atividades"
# 4. Clique em "Nova Atividade"
# 5. Preencha os campos e salve
```

## Estrutura da Atividade

```json
{
  "leadId": "uuid-do-lead",
  "type": "call|email|meeting|whatsapp|task|note",
  "description": "Descrição da atividade",
  "outcome": "interested|not_interested|callback|meeting_scheduled|no_answer|completed",
  "follow_up_required": true|false,
  "next_action": "Próxima ação a ser tomada",
  "duration_minutes": 15
}
```

## Endpoints Disponíveis

### Atividades
- `GET /backoffice/activities` - Listar atividades
- `POST /backoffice/activities` - Criar atividade
- `GET /leads/:id/activities` - Atividades de um lead específico

### Leads
- `GET /backoffice/leads` - Listar leads
- `POST /backoffice/leads` - Criar lead
- `PUT /backoffice/leads/:id` - Atualizar lead
- `PUT /backoffice/leads/:id/move` - Mover lead no pipeline

## Validações Implementadas

1. **Lead obrigatório**: Deve selecionar um lead
2. **Descrição obrigatória**: Deve ter pelo menos 5 caracteres
3. **Tipos válidos**: call, email, meeting, whatsapp, task, note
4. **Outcomes válidos**: interested, not_interested, callback, meeting_scheduled, no_answer, completed

## Funcionalidades Adicionadas

1. **Dashboard de Atividades**: Métricas rápidas por tipo
2. **Filtros por Tipo**: Visualização organizada
3. **Follow-up Tracking**: Controle de próximas ações
4. **Duração de Atividades**: Para calls e meetings
5. **Estado Vazio**: Mensagem quando não há atividades

## Troubleshooting

### Erro "Lead não encontrado"
- Verifique se existem leads no sistema
- Execute: `curl http://localhost:3020/leads`

### Erro "Campos obrigatórios"
- Execute a migração do banco de dados
- Reinicie os serviços

### Erro de conexão
- Verifique se todos os serviços estão rodando
- Execute: `status-crm.bat`

### Atividades não aparecem
- Verifique se a migração foi executada
- Teste a API diretamente: `curl http://localhost:3020/activities`

## Próximos Passos

1. **Notificações**: Alertas para follow-ups pendentes
2. **Relatórios**: Dashboard de produtividade
3. **Integração**: WhatsApp e email automático
4. **Mobile**: App para registro rápido de atividades