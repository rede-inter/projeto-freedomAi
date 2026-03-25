# Documentação da API — Copiloto Operacional de Suporte B2B

**Base URL:** `https://bd.redeinter.online`

**Autenticação:** todos os endpoints exigem o header `X-API-Key`.

**Envelope de resposta padrão:**
```json
// Sucesso
{ "success": true, "data": { ... } }

// Erro
{ "success": false, "error": { "code": "ERRO_CODE", "message": "...", "requestId": "uuid", "timestamp": "ISO8601" } }
```

---

## Health

### GET /health

Verifica o status do serviço.

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 3600,
    "timestamp": "2026-03-25T00:00:00.000Z"
  }
}
```

---

## Clientes

### GET /v1/customers

Retorna todos os clientes (dados mascarados).

**Headers:**
```
X-API-Key: dev-secret-key-change-in-production
```

**Resposta 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "CUST-001",
      "name": "Empresa Alpha Ltda",
      "cnpj": "**.***.***/**01-**",
      "email": "con***@alpha.com.br",
      "phone": "(**) *****-1234",
      "segment": "enterprise",
      "status": "active",
      "accountManager": "Carlos Mendes",
      "contractId": "CTR-001"
    }
  ]
}
```

---

### GET /v1/customer/:id

Retorna um cliente específico por ID.

**Parâmetros:**
- `:id` — ID do cliente no formato `CUST-XXX`

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "id": "CUST-001",
    "name": "Empresa Alpha Ltda",
    "cnpj": "**.***.***/**01-**",
    "email": "con***@alpha.com.br",
    "phone": "(**) *****-1234",
    "segment": "enterprise",
    "status": "active",
    "accountManager": "Carlos Mendes",
    "contractId": "CTR-001",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Erros:**
- `404 CUSTOMER_NOT_FOUND` — cliente não encontrado
- `400 INVALID_CUSTOMER_ID` — formato de ID inválido

---

### GET /v1/customer/:id/sla

Retorna o SLA de um cliente.

**Parâmetros:**
- `:id` — ID do cliente no formato `CUST-XXX`

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "customerId": "CUST-001",
    "plan": "premium",
    "responseTimeP1Hours": 1,
    "responseTimeP2Hours": 4,
    "responseTimeP3Hours": 8,
    "responseTimeP4Hours": 24,
    "uptimeGuarantee": 99.9,
    "supportHours": "24x7",
    "validFrom": "2024-01-01T00:00:00.000Z",
    "validUntil": "2026-12-31T23:59:59.000Z",
    "penaltyClause": true,
    "penaltyValuePerHour": 500,
    "extraFields": {
      "slaExpired": false,
      "outsideSupportWindow": false
    }
  }
}
```

**Erros:**
- `404 CUSTOMER_NOT_FOUND` — cliente não encontrado
- `404 SLA_NOT_FOUND` — SLA não encontrado para o cliente

---

## Tickets

### GET /v1/tickets

Retorna todos os tickets.

**Resposta 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "TKT-00001",
      "customerId": "CUST-001",
      "title": "Sistema de pagamento fora do ar",
      "category": "outage",
      "priority": "P2",
      "status": "open",
      "escalated": false,
      "createdAt": "2026-03-01T09:00:00.000Z"
    }
  ]
}
```

---

### GET /v1/ticket/:id

Retorna um ticket específico.

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "id": "TKT-00001",
    "customerId": "CUST-001",
    "title": "Sistema de pagamento fora do ar",
    "description": "O módulo de pagamento está retornando erro 500...",
    "category": "outage",
    "priority": "P2",
    "priorityAutoAssigned": true,
    "priorityOverridden": false,
    "status": "open",
    "assignee": null,
    "escalated": false,
    "escalationReason": null,
    "reporterEmail": "ope***@alpha.com.br",
    "affectedUsers": 50,
    "impactLevel": "high",
    "slaDeadline": "2026-03-01T13:00:00.000Z",
    "tags": ["pagamento", "producao"],
    "createdAt": "2026-03-01T09:00:00.000Z",
    "updatedAt": "2026-03-01T09:00:00.000Z"
  }
}
```

**Erros:**
- `404 TICKET_NOT_FOUND` — ticket não encontrado

---

### POST /v1/ticket

Cria um novo ticket com prioridade automática.

**Body:**
```json
{
  "customerId": "CUST-001",
  "title": "Falha no módulo de relatórios",
  "description": "O módulo de relatórios não está gerando PDFs desde as 14h. Afeta todos os usuários do departamento financeiro.",
  "category": "bug",
  "reporterEmail": "operacoes@alpha.com.br",
  "affectedUsers": 20,
  "impactLevel": "high",
  "tags": ["relatorios", "financeiro"]
}
```

**Validações:**
- `customerId` — formato `CUST-[A-Z0-9]+`, cliente deve existir e estar ativo
- `title` — entre 10 e 120 caracteres
- `description` — mínimo 30 caracteres
- `category` — `bug | feature | question | outage`
- `reporterEmail` — email válido
- **Idempotência:** hash SHA-256(customerId + title + description) com janela de 5 minutos → 409 se duplicado

**Resposta 201:**
```json
{
  "success": true,
  "data": {
    "id": "TKT-00006",
    "customerId": "CUST-001",
    "title": "Falha no módulo de relatórios",
    "priority": "P2",
    "priorityAutoAssigned": true,
    "status": "open",
    "slaDeadline": "2026-03-25T04:00:00.000Z",
    "createdAt": "2026-03-25T00:00:00.000Z"
  }
}
```

**Erros:**
- `400 VALIDATION_ERROR` — campos inválidos
- `403 CUSTOMER_SUSPENDED` — cliente suspenso
- `404 CUSTOMER_NOT_FOUND` — cliente não encontrado
- `409 DUPLICATE_TICKET` — ticket duplicado (idempotência)

---

### POST /v1/ticket/:id/escalate

Escalona um ticket existente.

**Body:**
```json
{
  "justification": "Cliente enterprise com SLA P1 em risco. Sistema crítico afetando 500 usuários em produção.",
  "requestedBy": "Carlos Mendes",
  "newPriority": "P1"
}
```

**Validações:**
- `justification` — mínimo 20 caracteres
- Ticket não pode estar já escalado → 409
- Ticket não pode estar fechado/resolvido → 409

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "id": "TKT-00001",
    "escalated": true,
    "escalationReason": "Cliente enterprise com SLA P1 em risco...",
    "escalatedBy": "Carlos Mendes",
    "escalatedAt": "2026-03-25T00:05:00.000Z",
    "priority": "P1"
  }
}
```

**Erros:**
- `409 ALREADY_ESCALATED` — ticket já escalado
- `409 TICKET_CLOSED` — ticket fechado ou resolvido
- `404 TICKET_NOT_FOUND` — ticket não encontrado

---

## Triagem

### POST /v1/triage

Realiza triagem e sugere prioridade com base nas regras de negócio.

**Body:**
```json
{
  "customerId": "CUST-001",
  "category": "outage",
  "impactLevel": "critical",
  "affectedUsers": 500,
  "description": "Sistema de autenticação completamente fora do ar. Nenhum usuário consegue fazer login."
}
```

**Regras de prioridade:**

| Condição | Prioridade |
|---|---|
| outage + critical | P1 |
| outage + affectedUsers >= 100 | P1 |
| outage + high/medium | P2 |
| outage (qualquer) | P2 |
| bug + critical | P2 |
| bug + high + enterprise | P2 |
| bug + high + não-enterprise | P3 |
| feature ou question | P4 |

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "suggestedPriority": "P1",
    "priorityReason": "Outage crítico — prioridade máxima",
    "slaResponseHours": 1,
    "recommendedActions": [
      "Acionar equipe de plantão imediatamente",
      "Notificar account manager Carlos Mendes",
      "Iniciar bridge de crise"
    ],
    "summary": "Outage crítico com 500 usuários afetados. SLA Premium exige resposta em 1h."
  }
}
```

---

## Conversa

### POST /v1/conversation/event

Registra um evento da conversa de atendimento.

**Body:**
```json
{
  "conversationId": "conv-abc123",
  "intent": "GET_CUSTOMER",
  "action": "consultar cliente",
  "customerId": "CUST-001",
  "ticketId": null,
  "result": "success"
}
```

**Resposta 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "conversationId": "conv-abc123",
    "timestamp": "2026-03-25T00:00:00.000Z",
    "intent": "GET_CUSTOMER",
    "action": "consultar cliente",
    "customerId": "CUST-001",
    "ticketId": null,
    "result": "success",
    "details": null
  }
}
```

---

### GET /v1/conversation/summary

Retorna o resumo estruturado de um atendimento.

**Query params:**
- `conversationId` — ID da conversa (obrigatório)

**Exemplo:** `GET /v1/conversation/summary?conversationId=conv-abc123`

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv-abc123",
    "startedAt": "2026-03-25T00:00:00.000Z",
    "updatedAt": "2026-03-25T00:10:00.000Z",
    "totalEvents": 3,
    "customersConsulted": ["CUST-001"],
    "ticketsConsulted": [],
    "ticketsCreated": ["TKT-00006"],
    "ticketsEscalated": [],
    "triagePerformed": false,
    "events": [ ... ],
    "summary": "Clientes consultados: CUST-001 | Tickets criados: TKT-00006"
  }
}
```

**Erros:**
- `404 NOT_FOUND` — nenhum evento encontrado para o conversationId

---

## Simulação de falhas (desenvolvimento)

Todos os endpoints aceitam o query param `?simulate=` para testes:

| Valor | Comportamento |
|---|---|
| `timeout` | HTTP 504 após 6.5s |
| `error` | HTTP 503 imediato |
| `latency` | Atraso de 3s + resposta normal |

**Exemplo:** `GET /v1/customer/CUST-001?simulate=latency`
