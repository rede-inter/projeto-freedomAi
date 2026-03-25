# Dify Scripts — Code Nodes do Copiloto Operacional de Suporte

Scripts JavaScript para uso direto nos **Code Nodes** do Dify Chatflow.
Copie e cole o conteúdo de cada arquivo no campo de código do nó correspondente.

## Arquivos e Nós Correspondentes

| Arquivo | Nó Dify | Função |
|---------|---------|--------|
| `copilot_http_post.js` | N37, N43, N52 | POST resiliente com retry + AbortController timeout |
| `handle_get_failure.js` | N11f, N21f | Failure branch dos HTTP Request Nodes (GET) |
| `parse_intent.js` | N03 | Parsing seguro do output do LLM Intent Classifier |
| `parse_create_slots.js` | N31 | Parsing e validação dos slots de criação de ticket |
| `parse_confirm.js` | N35 | Normalização de confirmação sim/não (100% determinístico) |
| `parse_resp_ticket.js` | N38 | Parsing da resposta de criação de ticket |
| `guardrail_create.js` | N32 | Hard guardrail antes de POST /v1/ticket |
| `guardrail_escalate.js` | N41 | Hard guardrail + GET inline antes de POST /escalate |
| `merge_context.js` | N03b | Merge inteligente de contexto entre turnos |
| `context_gate.js` | antes N34 | Verificação de consistência de cliente no contexto |
| `check_circuit.js` | antes HTTP | Circuit breaker por sessão |
| `update_circuit.js` | após HTTP | Atualiza contador do circuit breaker |

## Variáveis de Ambiente Necessárias no Dify

Configure em **Settings > Environment Variables**:

```
BACKEND_URL      = http://localhost:3000   (ou URL de produção)
BACKEND_API_KEY  = dev-secret-key-change-in-production
```

## Variáveis de Conversa (conversation_variables)

Configure em **Settings > Variables** com valores padrão:

| Variável | Tipo | Padrão |
|----------|------|--------|
| `cv_intent` | string | `""` |
| `cv_customer_id` | string | `""` |
| `cv_ticket_id` | string | `""` |
| `cv_ticket_title` | string | `""` |
| `cv_ticket_desc` | string | `""` |
| `cv_ticket_category` | string | `""` |
| `cv_reporter_email` | string | `""` |
| `cv_escalation_reason` | string | `""` |
| `cv_escalation_requestedby` | string | `""` |
| `cv_confirmation_pending` | string | `""` |
| `cv_clarify_attempts` | number | `0` |
| `cv_triage_category` | string | `""` |
| `cv_triage_impact` | string | `""` |
| `cv_affected_users` | number | `1` |
| `cv_last_error` | string | `""` |
| `cv_consecutive_failures` | string | `"0"` |
| `cv_guard_errors` | string | `""` |
| `cv_last_http_status` | string | `""` |
| `cv_last_http_error` | string | `""` |
| `cv_confirm_attempts` | string | `"0"` |
| `cv_http_attempts` | string | `"0"` |

## Fluxo de Nós (V3.0 — 32 nós)

```
N01 reset_turn          → Variable Assigner (limpa vars de turno)
N02 intent_classifier   → LLM Node (temp 0.1, output JSON)
N03 parse_intent        → Code Node [parse_intent.js]
N03b merge_context      → Code Node [merge_context.js]
N04 assign_intent       → Variable Assigner
N05 route_intent        → Condition Node (7 branches)
  ├── CONSULTA_CLIENTE  → N11 http_get_customer
  ├── CONSULTA_TICKET   → N21 http_get_ticket
  ├── CONSULTA_SLA      → N11 http_get_customer_sla
  ├── ABERTURA_TICKET   → N30 extract_create
  ├── ESCALAMENTO       → N40 extract_escalate
  ├── TRIAGEM           → N50 extract_triage
  └── UNKNOWN/AMBIGUO   → N70 handle_unknown

[Branch CREATE TICKET]
N30 extract_create      → LLM Node (temp 0.0)
N31 parse_create_slots  → Code Node [parse_create_slots.js]
N31b assign_create_slots→ Variable Assigner
N32 guardrail_create    → Code Node [guardrail_create.js]
  ├── FAIL              → N33 collect_missing (LLM)
  └── PASS              → context_gate → N34 confirm_create
N34 confirm_create      → Question Node
N35 parse_confirm       → Code Node [parse_confirm.js]
N36 route_confirm       → Condition Node (YES/NO/AMBIGUOUS)
N37 http_create         → Code Node [copilot_http_post.js] (endpoint=/v1/ticket)
N38 parse_resp_ticket   → Code Node [parse_resp_ticket.js]
N38b reset_create_slots → Variable Assigner (limpa cv_ticket_*)
N39 format_created      → Answer Node

[Branch ESCALAMENTO]
N40 extract_escalate    → LLM Node (temp 0.0)
N40b assign_escalate    → Variable Assigner
N41 guardrail_escalate  → Code Node [guardrail_escalate.js]
  ├── FAIL              → Answer Node (erro)
  └── PASS              → N42 confirm_escalate
N42 confirm_escalate    → Question Node
N43 http_escalate       → Code Node [copilot_http_post.js] (endpoint=/v1/ticket/:id/escalate)
N44 format_escalated    → Answer Node

[Branch TRIAGEM]
N50 extract_triage      → LLM Node (temp 0.0)
N51 guardrail_triage    → Condition Node
N52 http_triage         → Code Node [copilot_http_post.js] (endpoint=/v1/triage)
N53 format_triage       → Answer Node

N70 handle_unknown      → LLM Node (temp 0.3)
N_ERR error_handler     → Answer Node
```
