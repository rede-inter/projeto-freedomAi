# Limitações e Melhorias Futuras

## Limitações atuais

### 1. Armazenamento em memória (sem persistência)

**O que é:** todos os dados (clientes, tickets, SLAs, eventos de conversa) vivem em memória RAM. Ao reiniciar o servidor, todos os tickets criados e eventos registrados são perdidos. Os dados seed (clientes mock e tickets iniciais) são recarregados a cada start.

**Impacto:** em produção, isso impede múltiplas instâncias do serviço e torna o sistema não-resiliente a restarts.

**Solução futura:** integrar banco de dados relacional (PostgreSQL) ou document store (MongoDB) com migrations e seed controlado.

---

### 2. Dados mock estáticos

**O que é:** os clientes e tickets são dados de demonstração fixos no código (`src/mocks/`). Não há integração com sistemas reais de CRM ou helpdesk.

**Impacto:** o copiloto só consegue consultar os 5 clientes e 5 tickets pré-definidos.

**Solução futura:** integrar com APIs reais (Salesforce, Zendesk, Freshdesk, etc.) via adaptadores no repositório, mantendo a interface de serviço inalterada.

---

### 3. Autenticação única via API Key

**O que é:** a autenticação é feita por uma única chave de API compartilhada entre todos os agentes. Não há controle por usuário, por perfil ou por sessão.

**Impacto:** impossível auditar quem fez o quê, revogar acesso de um agente específico ou implementar RBAC.

**Solução futura:** implementar JWT com perfis (agente, supervisor, admin), controle de sessão e log de auditoria por usuário.

---

### 4. Circuit breaker em memória

**O que é:** o circuit breaker (`src/infra/resilience/circuitBreaker.ts`) mantém estado por instância do processo.

**Impacto:** em deploys multi-instância, cada instância tem seu próprio estado de circuit breaker — sem coordenação entre elas.

**Solução futura:** externalizar o estado do circuit breaker em Redis ou usar um service mesh (Istio, Linkerd) para controle centralizado.

---

### 5. Endpoints de lista paralelos aos endpoints por ID

**O que é:** o backend expõe tanto endpoints de lista (`/v1/customers`) quanto endpoints por ID (`/v1/customer/:id`). A integração com o Estúdio utiliza os endpoints de lista com filtro aplicado em Code nodes.

**Impacto:** superfície de API ligeiramente maior que o mínimo RESTful necessário.

**Solução futura:** consolidar para apenas os endpoints padrão RESTful conforme a camada de orquestração evoluir.

---

### 6. Base de conhecimento estática

**O que é:** a documentação de processos e políticas está em `suporte-docs.txt` — um arquivo de texto importado manualmente no Estúdio.

**Impacto:** atualizações de política exigem reedição manual do arquivo e reimportação no Estúdio.

**Solução futura:** integrar com um sistema de gestão de conhecimento (Confluence, Notion, etc.) via webhook ou pipeline de sync automatizado.

---

### 7. Sem rastreamento de SLA em tempo real

**O que é:** o campo `slaDeadline` nos tickets é calculado no momento da criação com base no SLA do cliente. Não há monitoramento contínuo de tickets próximos do vencimento.

**Impacto:** o copiloto não alerta proativamente sobre tickets em risco de SLA.

**Solução futura:** implementar job scheduler (cron) para varrer tickets abertos, detectar proximidade do SLA e emitir alertas via webhook/email.

---

## Melhorias futuras prioritárias

| Prioridade | Melhoria | Impacto |
|---|---|---|
| Alta | Banco de dados com persistência | Dados sobrevivem a restarts |
| Alta | Autenticação por usuário com JWT | Rastreabilidade e controle de acesso |
| Alta | Integração com sistemas reais (CRM/helpdesk) | Dados reais em vez de mocks |
| Média | Circuit breaker externo (Redis) | Resiliência em multi-instância |
| Média | Alertas de SLA em risco | Prevenção proativa de SLA breach |
| Média | Base de conhecimento sincronizada | Documentação sempre atualizada |
| Baixa | Dashboard de métricas (Grafana) | Visibilidade operacional |
| Baixa | Suporte a múltiplos idiomas no LLM | Expansão internacional |
| Baixa | Feedback loop do agente | Melhoria contínua da classificação de intenção |
