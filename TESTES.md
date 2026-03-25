# Evidências de Testes — Copiloto Operacional de Suporte B2B

## Resultado geral

```
Test Files  9 passed (9)
     Tests  84 passed (84)
  Start at  00:41:13
  Duration  8.15s
```

**84 testes — 9 suítes — 100% passando**

---

## Detalhamento por suíte

### 1. unit/priority (13 testes)

Testa as regras de prioridade automática isoladas da API.

| Teste | Status |
|---|---|
| outage + critical → P1 | ✅ |
| outage + affectedUsers >= 100 → P1 | ✅ |
| outage + high → P2 | ✅ |
| outage + medium → P2 | ✅ |
| outage sem impact → P2 | ✅ |
| bug + critical → P2 | ✅ |
| bug + high + enterprise → P2 | ✅ |
| bug + high + mid → P3 | ✅ |
| bug + high + smb → P3 | ✅ |
| feature → P4 | ✅ |
| question → P4 | ✅ |
| enterprise bug (floor P2) | ✅ |
| default → P3 | ✅ |

---

### 2. unit/mask (9 testes)

Testa mascaramento de dados sensíveis.

| Teste | Status |
|---|---|
| email mascara corretamente | ✅ |
| email curto mascara corretamente | ✅ |
| CNPJ mascara corretamente | ✅ |
| telefone celular mascara corretamente | ✅ |
| telefone fixo mascara corretamente | ✅ |
| dados sem padrão passam sem alteração | ✅ |
| mascaramento em objeto completo | ✅ |
| múltiplos campos mascarados | ✅ |
| campos nulos não quebram | ✅ |

---

### 3. unit/hash (7 testes)

Testa idempotência via hash SHA-256.

| Teste | Status |
|---|---|
| mesmo input gera mesmo hash | ✅ |
| inputs diferentes geram hashes diferentes | ✅ |
| hash é string hexadecimal de 64 chars | ✅ |
| espaços em branco são normalizados | ✅ |
| case insensitive para customerId | ✅ |
| janela de 5 minutos detecta duplicata | ✅ |
| após 5 minutos não detecta duplicata | ✅ |

---

### 4. integration/customer (8 testes)

| Teste | Status |
|---|---|
| GET /v1/customers retorna lista com 200 | ✅ |
| GET /v1/customer/CUST-001 retorna dados mascarados | ✅ |
| GET /v1/customer/CUST-001/sla retorna SLA | ✅ |
| GET /v1/customer/CUST-EXP/sla retorna slaExpired: true | ✅ |
| GET /v1/customer/CUST-999 retorna 404 | ✅ |
| GET /v1/customer/invalido retorna 400 | ✅ |
| requisição sem X-API-Key retorna 401 | ✅ |
| dados sensíveis não aparecem sem mascaramento | ✅ |

---

### 5. integration/ticket (24 testes)

| Teste | Status |
|---|---|
| GET /v1/tickets retorna lista com 200 | ✅ |
| GET /v1/ticket/TKT-00001 retorna ticket | ✅ |
| GET /v1/ticket/TKT-99999 retorna 404 | ✅ |
| POST /v1/ticket cria ticket válido → 201 | ✅ |
| POST /v1/ticket retorna prioridade auto-atribuída | ✅ |
| POST /v1/ticket outage+critical → P1 | ✅ |
| POST /v1/ticket campos faltando → 400 com detalhes | ✅ |
| POST /v1/ticket title < 10 chars → 400 | ✅ |
| POST /v1/ticket description < 30 chars → 400 | ✅ |
| POST /v1/ticket category inválida → 400 | ✅ |
| POST /v1/ticket email inválido → 400 | ✅ |
| POST /v1/ticket cliente suspenso → 403 | ✅ |
| POST /v1/ticket cliente inexistente → 404 | ✅ |
| POST /v1/ticket duplicado (idempotência) → 409 | ✅ |
| POST /v1/ticket idempotência respeita janela 5min | ✅ |
| POST /v1/ticket/:id/escalate com justificativa válida → 200 | ✅ |
| POST /v1/ticket/:id/escalate atualiza prioridade | ✅ |
| POST /v1/ticket/:id/escalate justificativa < 20 chars → 400 | ✅ |
| POST /v1/ticket/TKT-00003/escalate (já escalado) → 409 | ✅ |
| POST /v1/ticket/TKT-00004/escalate (resolved) → 409 | ✅ |
| POST /v1/ticket/TKT-00005/escalate (closed) → 409 | ✅ |
| POST /v1/ticket/TKT-99999/escalate → 404 | ✅ |
| sem X-API-Key → 401 | ✅ |
| email do reporter mascarado na resposta | ✅ |

---

### 6. integration/triage (8 testes)

| Teste | Status |
|---|---|
| outage + critical → P1 + ações recomendadas | ✅ |
| outage + high + 150 users → P1 | ✅ |
| bug + high + enterprise → P2 | ✅ |
| question → P4 | ✅ |
| feature → P4 | ✅ |
| campos obrigatórios faltando → 400 | ✅ |
| cliente inexistente → 404 | ✅ |
| sem X-API-Key → 401 | ✅ |

---

### 7. integration/conversation (6 testes)

| Teste | Status |
|---|---|
| POST /v1/conversation/event registra evento → 201 | ✅ |
| POST /v1/conversation/event campos faltando → 400 | ✅ |
| POST /v1/conversation/event sem X-API-Key → 401 | ✅ |
| GET /v1/conversation/summary retorna resumo agregado | ✅ |
| GET /v1/conversation/summary conversationId inexistente → 404 | ✅ |
| GET /v1/conversation/summary sem conversationId → 400 | ✅ |

---

### 8. integration/health (3 testes)

| Teste | Status |
|---|---|
| GET /health retorna 200 | ✅ |
| resposta contém status: ok | ✅ |
| resposta contém uptime | ✅ |

---

### 9. integration/simulate (6 testes)

| Teste | Status |
|---|---|
| ?simulate=error → 503 | ✅ |
| ?simulate=timeout → 504 após 6.5s | ✅ |
| ?simulate=latency → 200 com atraso ~3s | ✅ |
| simulate funciona em GET /customer | ✅ |
| simulate funciona em POST /ticket | ✅ |
| simulate funciona em POST /triage | ✅ |

---

## Como reproduzir

```bash
cd "copilot-backend 2"
npm install
npm test
```

Output esperado:
```
Test Files  9 passed (9)
     Tests  84 passed (84)
```
