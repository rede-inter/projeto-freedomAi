// ============================================================
// Code Node: merge_context (N03b)
// Nó: Merge inteligente de contexto — executado entre parse_intent e assign_intent
//     Não sobrescreve variáveis existentes com strings vazias
//
// INPUTS:
//   - parsed_customer_id  : string (extraído do LLM — pode ser '')
//   - parsed_ticket_id    : string (extraído do LLM — pode ser '')
//   - parsed_intent       : string
//   - cv_customer_id      : string (variável de conversa atual)
//   - cv_ticket_id        : string (variável de conversa atual)
//   - cv_clarify_attempts : string (número de tentativas de esclarecimento)
//
// OUTPUTS:
//   - merged_customer_id     : string
//   - merged_ticket_id       : string
//   - merged_clarify_attempts: string
// ============================================================

// cv_customer_id: atualiza se LLM extraiu novo ID; caso contrário, mantém existente
const newCustomerId = parsed_customer_id && parsed_customer_id.trim() !== ''
  ? parsed_customer_id.trim()
  : (cv_customer_id || '');

const newTicketId = parsed_ticket_id && parsed_ticket_id.trim() !== ''
  ? parsed_ticket_id.trim()
  : (cv_ticket_id || '');

// Reset de clarify_attempts apenas quando intenção foi resolvida
const newClarifyAttempts = parsed_intent !== 'UNKNOWN'
  ? '0'
  : (cv_clarify_attempts || '0');

return {
  merged_customer_id:      newCustomerId,
  merged_ticket_id:        newTicketId,
  merged_clarify_attempts: newClarifyAttempts,
};

// O Variable Assigner N04 usa estes outputs merged_*
// em vez dos parsed_* diretos do LLM
