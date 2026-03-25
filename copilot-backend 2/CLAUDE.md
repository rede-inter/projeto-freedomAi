# CLAUDE.md — Copiloto Operacional de Suporte B2B

## Contexto do projeto

Backend Node.js/Fastify para copiloto interno B2B. Integra com Dify Chatflow como orquestrador de IA.
O backend é a fonte de verdade: todas as regras de negócio, validações e persistência ficam aqui.
O Dify apenas orquestra — não contém lógica crítica.

## Stack obrigatório

- Node.js 20+ / TypeScript 5+
- Framework: Fastify 4
- Validação: Zod
- Logging: Pino
- Testes: Vitest
- HTTP client: fetch nativo (Node 20+) com wrapper customizado

## Estrutura de pastas

```
src/
  app.ts                    # Fastify factory
  server.ts                 # Entry point (listen)
  config/env.ts             # Zod env validation
  types/index.ts            # All TypeScript interfaces
  schemas/                  # Zod schemas (request + response)
  controllers/              # HTTP handlers — thin, delegate to services
  services/                 # Business logic
  repositories/             # Data access (in-memory for now)
  routes/                   # Route registration
  middlewares/              # Auth, error handler
  infra/
    http/httpClient.ts      # Resilient HTTP client (retry + timeout)
    resilience/circuitBreaker.ts  # Real circuit breaker (closed/open/half-open)
  utils/                    # mask, priority, hash, errors, response
  mocks/                    # Seed data
```

## Formato de resposta OBRIGATÓRIO

Todos os endpoints devem retornar exatamente este envelope:

```typescript
// Sucesso
{ "success": true, "data": { ... } }

// Erro
{ "success": false, "error": { "code": "TICKET_NOT_FOUND", "message": "..." }, "requestId": "uuid", "timestamp": "ISO8601" }
```

## Endpoints obrigatórios

```
GET  /v1/customer/:id          → CustomerController.getCustomer
GET  /v1/customer/:id/sla      → CustomerController.getCustomerSla
GET  /v1/ticket/:id            → TicketController.getTicket
POST /v1/ticket                → TicketController.createTicket
POST /v1/ticket/:id/escalate   → TicketController.escalateTicket
POST /v1/triage                → TriageController.triage
GET  /health                   → HealthController (uptime + deps status)
```

## Circuit Breaker — IMPLEMENTAR NO BACKEND (não no Dify)

O circuit breaker DEVE estar em `src/infra/resilience/circuitBreaker.ts`.
Estados: `closed` → `open` → `half-open` → `closed`.

```typescript
interface CircuitBreakerState {
  status: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailureAt: number | null;
  successCount: number;         // in half-open
}

const FAILURE_THRESHOLD = 5;   // open after 5 failures
const COOLDOWN_MS = 60_000;    // 1 minute
const HALF_OPEN_SUCCESSES = 2; // close after 2 successes in half-open
```

## HTTP Client resiliente — `src/infra/http/httpClient.ts`

```typescript
interface HttpClientConfig {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
  maxRetries: number;         // default 3
  retryableStatuses: number[]; // default [502, 503, 504]
  backoffMs: number[];        // default [0, 500, 1000]
}
```

Deve usar AbortController para timeout real. Retry apenas em erros transitórios (5xx e rede).
NÃO retry em 4xx.

## Regras de negócio críticas

### Criação de ticket
- customerId obrigatório e formato CUST-[A-Z0-9]+
- title: 10-120 chars
- description: mínimo 30 chars
- category: bug | feature | question | outage
- reporterEmail: email válido
- **Idempotência**: hash SHA-256(customerId + title + description) — janela 5 min → 409 se duplicado

### Prioridade automática (calculatePriority)
```
outage + critical             → P1
outage + affectedUsers >= 100 → P1
outage + high|medium          → P2
outage (qualquer)             → P2
bug + critical                → P2
bug + high + enterprise       → P2
bug + high + não-enterprise   → P3
feature | question            → P4
enterprise + bug (default)    → P2 (floor)
default                       → P3
```

### Escalonamento
- justification: mínimo 20 chars
- ticket.escalated == true → 409 ALREADY_ESCALATED
- ticket.status == closed|resolved → 409 TICKET_CLOSED

### Mascaramento obrigatório na saída
- email: `joa***@empresa.com`
- cnpj: `**.***.***/**01-**`
- telefone: `(**) *****-1234`

## Validações Zod — schemas/

Criar um schema Zod por endpoint. Validar request E response (para garantir contrato).

```typescript
// schemas/ticket.schema.ts
export const CreateTicketRequestSchema = z.object({ ... }).strict();
export const CreateTicketResponseSchema = z.object({ ... });
export const TicketSchema = z.object({ ... }); // domain object
```

## Logging estruturado (Pino)

Cada request deve logar:
```json
{
  "level": "info",
  "requestId": "uuid",
  "conversationId": "header X-Conversation-Id",
  "method": "POST",
  "url": "/v1/ticket",
  "statusCode": 201,
  "durationMs": 45,
  "event": "ticket.created"
}
```

O `requestId` é gerado pelo Fastify (`genReqId: () => randomUUID()`).
O `conversationId` vem do header `X-Conversation-Id` (enviado pelo Dify).

## Segurança

- Header `X-API-Key` validado em todos os endpoints via middleware
- Chave lida de `process.env.STUDIO_API_KEY`
- Payload máximo: `express.json({ limit: '10kb' })`
- Input sanitization: trim() em todas as strings antes de validar

## Simulação de falhas (desenvolvimento)

Query param `?simulate=timeout|error|latency` disponível em todos os endpoints.
- `timeout` → HTTP 504 após 6.5s
- `error` → HTTP 503 imediato
- `latency` → atraso de 3s + resposta normal

## Testes obrigatórios (Vitest)

Cobrir obrigatoriamente:
1. Criação de ticket válido → 201
2. Idempotência → 409 com ID existente
3. Ticket com campos faltando → 400 com detalhes
4. Escalonamento de ticket já escalado → 409
5. Escalonamento de ticket fechado → 409
6. Cliente suspenso tentando abrir ticket → 403
7. Triage com outage + critical → P1
8. Triage com question → P4
9. SLA expirado → slaExpired: true no response
10. Simulate=error → 503

## Mock data (seed inicial)

Clientes:
- CUST-001: enterprise, active, SLA premium (P1=1h, 24x7)
- CUST-002: mid, active, SLA standard (P1=4h, 24x7)
- CUST-003: smb, active, SLA basic (P1=8h, 8x5)
- CUST-004: smb, **suspended**
- CUST-EXP: mid, active, SLA **expirado**

Tickets:
- TKT-00001: open, P2, não escalado (CUST-001)
- TKT-00002: in_progress, P3 (CUST-001)
- TKT-00003: open, P1, **já escalado** (CUST-002)
- TKT-00004: resolved, P4 (CUST-003)
- TKT-00005: closed, P4 (CUST-001)

## Scripts npm obrigatórios

```json
{
  "dev": "tsx watch src/server.ts",
  "build": "tsc",
  "build:check": "tsc --noEmit",
  "start": "node dist/server.js",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

## Integração com Dify

O Dify envia sempre:
- Header `X-API-Key: {{env.BACKEND_API_KEY}}`
- Header `X-Conversation-Id: {{sys.conversation_id}}`
- Content-Type: `application/json`

O backend responde sempre com o envelope `{ success, data|error }`.

O arquivo `copilot_chatflow_v2.json` (na raiz do projeto) é o export do Dify Chatflow.
Não modificar o contrato de API sem atualizar o JSON correspondente.

## Variáveis de ambiente (.env)

```
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
STUDIO_API_KEY=dev-secret-key-change-in-production
USE_MOCK_APIS=true
API_TIMEOUT_MS=5000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

## O que NÃO fazer

- Não colocar regras de negócio no Dify (só no backend)
- Não retornar dados sensíveis sem mascarar
- Não fazer retry em erros 4xx
- Não usar LLM para decisões críticas de fluxo
- Não ignorar o schema Zod de resposta
- Não criar endpoints sem autenticação X-API-Key
