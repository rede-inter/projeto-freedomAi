# Copiloto Operacional de Suporte — Backend

Backend REST em **Node.js + TypeScript + Fastify** para o Copiloto Operacional de Suporte B2B.  
Compatível com o **Dify Chatflow** descrito no blueprint de orquestração.

---

## Requisitos

| Ferramenta | Versão mínima |
|------------|--------------|
| Node.js    | 20.x         |
| npm        | 10.x         |

---

## Setup

```bash
git clone <repo>
cd copilot-backend

npm install

cp .env.example .env
# Edite .env conforme necessário (valores padrão já funcionam para dev)
```

---

## Rodar

```bash
# Desenvolvimento (hot reload)
npm run dev

# Produção
npm run build
npm start
```

O servidor sobe em `http://localhost:3000` por padrão.

**Verificar saúde:**
```bash
curl http://localhost:3000/health
```

---

## Variáveis de Ambiente

| Variável              | Padrão                                | Descrição                             |
|-----------------------|---------------------------------------|---------------------------------------|
| `PORT`                | `3000`                                | Porta HTTP                            |
| `NODE_ENV`            | `development`                         | `development` \| `production` \| `test` |
| `LOG_LEVEL`           | `info`                                | `trace` \| `debug` \| `info` \| `warn` \| `error` |
| `STUDIO_API_KEY`      | `dev-secret-key-change-in-production` | Token para header `X-API-Key`         |
| `USE_MOCK_APIS`       | `true`                                | `true` = dados em memória             |
| `API_TIMEOUT_MS`      | `5000`                                | Timeout para APIs externas (ms)       |
| `RATE_LIMIT_WINDOW_MS`| `900000`                              | Janela de rate limit (ms)             |
| `RATE_LIMIT_MAX`      | `100`                                 | Máximo de requests por janela         |

---

## Testes

```bash
# Todos os testes
npm test

# Com watch (re-executa ao salvar)
npm run test:watch

# Com cobertura
npm run test:coverage
```

**Suítes disponíveis:**
- `tests/unit/` — lógica pura (priority calculator, mask, hash)
- `tests/integration/` — endpoints HTTP (customer, ticket, triage, simulate, health)

---

## Estrutura do Projeto

```
src/
├── server.ts              # Ponto de entrada (listen)
├── app.ts                 # Factory do Fastify (middlewares + rotas)
├── config/
│   └── env.ts             # Validação de ENV vars com Zod
├── types/
│   └── index.ts           # Interfaces e tipos TypeScript
├── mocks/
│   ├── customers.mock.ts  # Seed de clientes/SLA em memória
│   └── tickets.mock.ts    # Seed de tickets em memória
├── repositories/
│   ├── customer.repository.ts
│   └── ticket.repository.ts
├── services/
│   ├── customer.service.ts
│   ├── ticket.service.ts
│   └── triage.service.ts
├── controllers/
│   ├── customer.controller.ts
│   ├── ticket.controller.ts
│   └── triage.controller.ts
├── routes/
│   ├── customer.routes.ts
│   ├── ticket.routes.ts
│   ├── triage.routes.ts
│   └── health.routes.ts
├── validators/
│   ├── customer.validator.ts
│   ├── ticket.validator.ts
│   └── triage.validator.ts
├── middlewares/
│   ├── auth.middleware.ts      # Valida X-API-Key
│   ├── simulate.middleware.ts  # ?simulate=timeout|error|latency
│   └── error.middleware.ts     # Handler global de erros
└── utils/
    ├── mask.ts         # Mascaramento de dados sensíveis
    ├── priority.ts     # Calculadora de prioridade P1–P4
    ├── hash.ts         # Hash de idempotência
    ├── errors.ts       # Classes de erro padronizadas
    └── response.ts     # Builders de resposta
```

---

## Endpoints

Todos os endpoints exigem os headers:
```
X-API-Key: <STUDIO_API_KEY>
X-Conversation-Id: <id da conversa do Dify>
```

### GET /v1/customer/:id
Retorna dados do cliente com dados sensíveis mascarados.

```bash
curl -H "X-API-Key: dev-secret-key-change-in-production" \
     -H "X-Conversation-Id: conv-123" \
     http://localhost:3000/v1/customer/CUST-001
```

**Clientes disponíveis no mock:**
- `CUST-001` — enterprise, active
- `CUST-002` — mid, active
- `CUST-003` — smb, active
- `CUST-004` — smb, **suspended**
- `CUST-EXP` — mid, active, SLA **expirado**

---

### GET /v1/customer/:id/sla
Retorna SLA do cliente com flags `slaExpired` e `outsideSupportWindow`.

```bash
curl -H "X-API-Key: dev-secret-key-change-in-production" \
     http://localhost:3000/v1/customer/CUST-001/sla

# SLA expirado — retorna extraFields.slaExpired: true
curl -H "X-API-Key: dev-secret-key-change-in-production" \
     http://localhost:3000/v1/customer/CUST-EXP/sla
```

---

### GET /v1/ticket/:id
```bash
curl -H "X-API-Key: dev-secret-key-change-in-production" \
     http://localhost:3000/v1/ticket/TKT-00001
```

**Tickets disponíveis no mock:**
- `TKT-00001` — open, P2, não escalado
- `TKT-00002` — in_progress, P3
- `TKT-00003` — open, P1, **já escalado**
- `TKT-00004` — resolved, P4
- `TKT-00005` — closed, P4

---

### POST /v1/ticket
```bash
curl -X POST \
     -H "X-API-Key: dev-secret-key-change-in-production" \
     -H "Content-Type: application/json" \
     -d '{
       "customerId": "CUST-001",
       "title": "Sistema nao inicializa apos deploy",
       "description": "Apos o deploy das 10h o sistema principal nao consegue inicializar. Todos os usuarios estao impactados e o erro persiste.",
       "category": "outage",
       "reporterEmail": "ops@empresa.com.br",
       "affectedUsers": 250,
       "impactLevel": "critical"
     }' \
     http://localhost:3000/v1/ticket
```

**Resposta 201:**
```json
{
  "success": true,
  "data": {
    "id": "TKT-00124",
    "priority": "P1",
    "priorityAutoAssigned": true,
    "priorityOverridden": false,
    "status": "open",
    "slaDeadline": "2024-03-15T11:00:00Z",
    "message": "Ticket criado com sucesso."
  }
}
```

---

### POST /v1/ticket/:id/escalate
```bash
curl -X POST \
     -H "X-API-Key: dev-secret-key-change-in-production" \
     -H "Content-Type: application/json" \
     -d '{
       "justification": "Impacto critico em producao afetando 500 usuarios desde as 09h. SLA em risco.",
       "requestedBy": "gerente@empresa.com.br",
       "newPriority": "P1"
     }' \
     http://localhost:3000/v1/ticket/TKT-00001/escalate
```

---

### POST /v1/triage
```bash
curl -X POST \
     -H "X-API-Key: dev-secret-key-change-in-production" \
     -H "Content-Type: application/json" \
     -d '{
       "customerId": "CUST-001",
       "category": "outage",
       "impactLevel": "critical",
       "affectedUsers": 500,
       "description": "Sistema de checkout completamente fora do ar desde as 09h. Todas as transacoes estao falhando."
     }' \
     http://localhost:3000/v1/triage
```

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "suggestedPriority": "P1",
    "priorityReason": "Outage critico detectado",
    "slaResponseHours": 1,
    "recommendedActions": [
      "Abrir ticket P1 imediatamente",
      "Notificar gerente de conta: Carla Mendes",
      "Escalar para time de infraestrutura / produto conforme categoria",
      "Iniciar bridge de incidente com stakeholders",
      "Cliente enterprise — monitorar SLA ativamente"
    ],
    "summary": "Cliente Empresa Alpha Ltda (CUST-001) reporta indisponibilidade com impacto critical afetando 500 usuario(s)..."
  }
}
```

---

## Simulação de Falhas

Adicione `?simulate=<modo>` a qualquer endpoint:

| Query param          | HTTP retornado | Código              |
|----------------------|---------------|---------------------|
| `?simulate=error`    | `503`         | `UPSTREAM_UNAVAILABLE` |
| `?simulate=timeout`  | `504`         | `UPSTREAM_TIMEOUT`  |
| `?simulate=latency`  | Normal (após 3s) | —               |

```bash
# Simular API offline
curl -H "X-API-Key: dev-secret-key-change-in-production" \
     "http://localhost:3000/v1/customer/CUST-001?simulate=error"

# Simular timeout
curl -H "X-API-Key: dev-secret-key-change-in-production" \
     "http://localhost:3000/v1/customer/CUST-001?simulate=timeout"
```

---

## Formato Padrão de Erro

```json
{
  "success": false,
  "error": {
    "code": "TICKET_NOT_FOUND",
    "message": "Ticket 'TKT-99999' nao encontrado",
    "details": null,
    "requestId": "a1b2c3d4-...",
    "timestamp": "2024-03-15T09:00:00.000Z"
  }
}
```

---

## Integração com Dify

No Dify, configure:

1. **Settings → Environment Variables**
   - `BACKEND_URL` = `http://localhost:3000` (ou URL de produção)
   - `BACKEND_API_KEY` = valor de `STUDIO_API_KEY` no `.env`

2. **HTTP Request Node** — exemplo para GET /customer/:id:
   ```
   Method: GET
   URL: {{env.BACKEND_URL}}/v1/customer/{{cv_customer_id}}
   Headers:
     X-API-Key: {{env.BACKEND_API_KEY}}
     X-Conversation-Id: {{sys.conversation_id}}
   Timeout: 6000
   ```

3. **Verificar status**: Condition Node `status_code == 200` após cada HTTP Node.

---

## Regras de Negócio

| Regra | Comportamento |
|-------|--------------|
| Título muito curto | `400 VALIDATION_ERROR` — mínimo 10 chars |
| Descrição muito curta | `400 VALIDATION_ERROR` — mínimo 30 chars |
| Ticket duplicado (5 min) | `409 DUPLICATE_TICKET` — retorna ID do existente |
| Cliente suspenso | `403 FORBIDDEN` — não pode abrir tickets |
| Escalar ticket fechado | `409 TICKET_CLOSED` |
| Escalar já escalado | `409 ALREADY_ESCALATED` |
| Justificativa curta | `400 VALIDATION_ERROR` — mínimo 20 chars |
| Prioridade auto-calculada | P1=outage+critical, P2=bug+enterprise, P4=question/feature |
| Dados sensíveis | email/cnpj/phone sempre mascarados na resposta |
