# Copiloto Operacional de Suporte B2B

Assistente interno de suporte B2B desenvolvido com o Estúdio como orquestrador de IA e backend Node.js/TypeScript como camada de regras de negócio e APIs.

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        USUÁRIO (Agente)                      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                         ESTÚDIO                              │
│                                                             │
│  LLM Classifier → parse_intent → Roteador de Intenção      │
│         │                                                   │
│   ┌─────┴──────────────────────────────────────────┐       │
│   │  GET_CUSTOMER │ GET_SLA │ GET_TICKET            │       │
│   │  CREATE_TICKET │ ESCALATE_TICKET │ TRIAGE       │       │
│   │  DUVIDA_DOCS │ RESUMO_ATENDIMENTO │ UNKNOWN     │       │
│   └─────┬──────────────────────────────────────────┘       │
│         │  Guardrails + Validação de IDs                    │
│         │  HTTP nodes → Backend API                         │
│         │  Filter + Format Code nodes                       │
│         │  Registro de eventos da conversa                  │
│         ▼                                                   │
│      Answer nodes (resposta ao usuário)                     │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP + X-API-Key
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Node.js / Fastify)                 │
│                    bd.redeinter.online                       │
│                                                             │
│  /v1/customer     /v1/ticket      /v1/triage                │
│  /v1/customers    /v1/tickets     /health                   │
│  /v1/conversation/event    /v1/conversation/summary         │
│                                                             │
│  Regras de negócio │ Validação Zod │ Mascaramento           │
│  Circuit Breaker   │ Rate Limiting │ Auth X-API-Key         │
│  Logging Pino      │ Idempotência  │ Prioridade automática  │
└─────────────────────────────────────────────────────────────┘
```

### Decisões técnicas

**Por que Fastify e não Express?**
Fastify oferece melhor performance, schema-first validation e suporte nativo a async/await. Para uma API de suporte interno com potencial de carga, a diferença de throughput é relevante.

**Por que armazenamento em memória?**
O escopo do teste técnico é demonstrar capacidade de engenharia, integração e uso de IA — não construir um sistema de produção completo. Armazenamento em memória elimina dependências externas e simplifica o deploy, mantendo o foco na lógica de negócio.

**Por que o Estúdio não contém regras de negócio?**
O Estúdio é usado exclusivamente como orquestrador: classifica intenção, coleta dados e exibe respostas. Toda lógica crítica (validação, prioridade, idempotência, mascaramento) vive no backend — testável, versionável e independente de LLM.

**Por que endpoints de lista (`/v1/customers`, `/v1/tickets`)?**
O Estúdio não suporta interpolação de variáveis em caminhos de URL HTTP (ex: `/v1/customer/{{id}}`). A solução foi usar endpoints de lista com filtro em Code nodes JavaScript — padrão mais robusto para integrações com o Estúdio.

**Por que TypeScript + Zod?**
TypeScript garante contratos em compile-time. Zod adiciona validação em runtime nas fronteiras do sistema (request body, env vars), eliminando uma classe inteira de bugs de tipo em produção.

---

## Estrutura do projeto

```
projeto-freedomAi/
├── copilot-backend 2/          # Backend Node.js/TypeScript
│   ├── src/
│   │   ├── app.ts              # Fastify factory
│   │   ├── server.ts           # Entry point
│   │   ├── config/env.ts       # Validação de variáveis de ambiente
│   │   ├── types/index.ts      # Interfaces TypeScript
│   │   ├── routes/             # Registro de rotas
│   │   ├── controllers/        # Handlers HTTP (thin layer)
│   │   ├── services/           # Regras de negócio
│   │   ├── repositories/       # Acesso a dados (in-memory)
│   │   ├── middlewares/        # Auth, error handler, simulate
│   │   ├── validators/         # Schemas Zod
│   │   ├── infra/
│   │   │   ├── http/           # HTTP client resiliente
│   │   │   └── resilience/     # Circuit breaker
│   │   ├── utils/              # mask, priority, hash, errors, response
│   │   └── mocks/              # Dados seed (clientes, SLAs, tickets)
│   ├── tests/
│   │   ├── unit/               # Testes unitários (priority, mask, hash)
│   │   └── integration/        # Testes de integração por endpoint
│   └── Dockerfile
├── dify-scripts/               # Scripts JS dos Code nodes (referência)
├── Copiloto Operacional de Suporte B2B.yml   # Fluxo do Estúdio (importar no Studio)
├── dify-docker-compose.yml     # Docker Compose para deploy do Estúdio
├── suporte-docs.txt            # Conteúdo da base de conhecimento
└── README.md
```

---

## Pré-requisitos

- Node.js 20+
- npm 10+
- Docker + Docker Swarm (para deploy em produção)

---

## Instalação e execução local

```bash
# 1. Entrar na pasta do backend
cd "copilot-backend 2"

# 2. Instalar dependências
npm install

# 3. Criar arquivo de variáveis de ambiente
cp .env.example .env
# Edite o .env conforme necessário

# 4. Executar em desenvolvimento
npm run dev

# 5. Executar testes
npm test

# 6. Build para produção
npm run build
npm start
```

### Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta do servidor |
| `NODE_ENV` | `development` | Ambiente |
| `LOG_LEVEL` | `info` | Nível de log (Pino) |
| `STUDIO_API_KEY` | `dev-secret-key-change-in-production` | Chave de autenticação da API |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Janela do rate limit (15min) |
| `RATE_LIMIT_MAX` | `100` | Máximo de requests por janela |
| `API_TIMEOUT_MS` | `5000` | Timeout para chamadas HTTP externas |

---

## Deploy em produção (Docker Swarm)

```bash
# Build da imagem
docker build --no-cache -t copilot-backend:latest .

# Deploy/atualização do serviço
docker service update --force --image copilot-backend:latest copilot_backend

# Verificar status
docker service ps copilot_backend
```

**Backend em produção:** `https://bd.redeinter.online`

---

## Configuração do Estúdio

1. Acesse o Studio em `https://desafio.freedomai.com.br/apps`
2. Crie um novo Chatflow
3. Importe o arquivo `Copiloto Operacional de Suporte B2B.yml`
4. Configure as variáveis de ambiente no Estúdio:
   - `BACKEND_URL`: URL base do backend (ex: `https://bd.redeinter.online`)
   - `BACKEND_API_KEY`: mesma chave configurada em `STUDIO_API_KEY` no backend
5. Configure a base de conhecimento com o conteúdo de `suporte-docs.txt`
6. Publique e teste

---

## Intenções suportadas

| Intent | Exemplo de mensagem | Dados necessários |
|---|---|---|
| `GET_CUSTOMER` | "Consultar cliente CUST-001" | ID do cliente (CUST-XXX) |
| `GET_SLA` | "Ver SLA do cliente CUST-002" | ID do cliente (CUST-XXX) |
| `GET_TICKET` | "Mostrar ticket TKT-00001" | ID do ticket (TKT-NNNNN) |
| `CREATE_TICKET` | "Quero abrir um ticket de suporte" | título, descrição, categoria, email |
| `ESCALATE_TICKET` | "Escalar o ticket TKT-00001" | ID do ticket, justificativa |
| `TRIAGE` | "Sistema fora do ar para 200 usuários" | descrição, impacto, usuários afetados |
| `DUVIDA_DOCS` | "Como funciona o escalonamento?" | — |
| `RESUMO_ATENDIMENTO` | "Resumo do atendimento" | — |

---

## Dados mock disponíveis

**Clientes:**
- `CUST-001` — Enterprise, ativo, SLA Premium (P1=1h, 24x7)
- `CUST-002` — Mid, ativo, SLA Standard (P1=4h, 24x7)
- `CUST-003` — SMB, ativo, SLA Basic (P1=8h, 8x5)
- `CUST-004` — SMB, **suspenso**
- `CUST-EXP` — Mid, SLA **expirado**

**Tickets:**
- `TKT-00001` — open, P2, não escalado (CUST-001)
- `TKT-00002` — in_progress, P3 (CUST-001)
- `TKT-00003` — open, P1, **já escalado** (CUST-002)
- `TKT-00004` — resolved, P4 (CUST-003)
- `TKT-00005` — closed, P4 (CUST-001)

---

## Testes

```bash
cd "copilot-backend 2"
npm test
```

**84 testes — 9 suítes — 100% passando**

| Suíte | Testes | Cobertura |
|---|---|---|
| `unit/priority` | 13 | Regras de prioridade automática |
| `unit/mask` | 9 | Mascaramento de dados sensíveis |
| `unit/hash` | 7 | Idempotência SHA-256 |
| `integration/customer` | 8 | GET customer, SLA, erros |
| `integration/ticket` | 24 | CRUD tickets, escalonamento, idempotência |
| `integration/triage` | 8 | Triagem com diferentes cenários |
| `integration/conversation` | 6 | Registro de eventos e resumo |
| `integration/health` | 3 | Health check |
| `integration/simulate` | 6 | Simulação de falhas (timeout, error, latency) |
