// ============================================================
// Code Node: guardrail_escalate (N41)
// Nó: Hard guardrail antes de POST /v1/ticket/:id/escalate
//     Inclui GET /ticket inline para verificar estado atual
//     100% determinístico — sem LLM
//
// INPUTS:
//   - cv_ticket_id               : string
//   - cv_escalation_reason       : string
//   - cv_escalation_requestedby  : string
//
// OUTPUTS:
//   - guard_ok           : string ('true' | 'false')
//   - guard_errors       : string
//   - esc_current_priority: string
//   - esc_current_status : string
// ============================================================

const errors = [];

// 1. ticketId
const ticketId = (cv_ticket_id || '').trim();
if (!ticketId || !/^TKT-\d{5}$/.test(ticketId)) {
  errors.push('ticketId inválido ou ausente (esperado: TKT-NNNNN)');
}

// 2. justification
const just = (cv_escalation_reason || '').trim();
if (just.length < 20) {
  errors.push('justification muito curta: ' + just.length + ' chars (mínimo: 20)');
}

// 3. requestedBy
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const reqBy    = (cv_escalation_requestedby || '').trim();
if (!EMAIL_RE.test(reqBy)) {
  errors.push('requestedBy inválido: ' + (reqBy || 'vazio'));
}

if (errors.length > 0) {
  return {
    guard_ok:              'false',
    guard_errors:          errors.join(' | '),
    esc_current_priority:  '',
    esc_current_status:    '',
  };
}

// 4. Pré-verificação de estado via GET /ticket
// (sem isso, POST pode retornar 409 após o agente já ter confirmado)
let ticketData = null;
try {
  const res = await fetch(env.BACKEND_URL + '/v1/ticket/' + ticketId, {
    method:  'GET',
    headers: {
      'X-API-Key':         env.BACKEND_API_KEY,
      'X-Conversation-Id': sys.conversation_id,
    },
  });

  if (!res.ok) {
    return {
      guard_ok:             'false',
      guard_errors:         'Ticket ' + ticketId + ' não encontrado (status ' + res.status + ')',
      esc_current_priority: '',
      esc_current_status:   '',
    };
  }

  const json  = await res.json();
  ticketData  = json.data;
} catch (e) {
  return {
    guard_ok:             'false',
    guard_errors:         'Falha ao verificar ticket: ' + e.message,
    esc_current_priority: '',
    esc_current_status:   '',
  };
}

// 5. Valida estado do ticket
if (ticketData.escalated) {
  return {
    guard_ok:             'false',
    guard_errors:         'Ticket já foi escalado em ' + (ticketData.escalatedAt || 'data desconhecida'),
    esc_current_priority: ticketData.priority,
    esc_current_status:   ticketData.status,
  };
}

if (['closed', 'resolved'].includes(ticketData.status)) {
  return {
    guard_ok:             'false',
    guard_errors:         'Ticket com status "' + ticketData.status + '" não pode ser escalado',
    esc_current_priority: ticketData.priority,
    esc_current_status:   ticketData.status,
  };
}

return {
  guard_ok:             'true',
  guard_errors:         '',
  esc_current_priority: ticketData.priority,
  esc_current_status:   ticketData.status,
};
