// ============================================================
// Code Node: parse_resp_ticket (N38)
// Nó: Parsing da resposta de criação de ticket (POST /v1/ticket)
//
// INPUTS:
//   - http_body   : string (JSON raw da resposta)
//   - http_status : number
//
// OUTPUTS:
//   - resp_ok           : string ('true' | 'false')
//   - resp_error_code   : string
//   - resp_error_msg    : string
//   - resp_ticket_id    : string
//   - resp_priority     : string
//   - resp_sla_deadline : string
//   - resp_auto_priority: string ('true' | 'false')
// ============================================================

if (http_status !== 201) {
  let code = 'API_ERROR';
  let msg  = 'Erro ao criar ticket (status ' + http_status + ').';

  try {
    const b = JSON.parse(http_body);
    code    = b?.error?.code    || code;
    msg     = b?.error?.message || msg;
  } catch (_) {}

  return {
    resp_ok:           'false',
    resp_error_code:   code,
    resp_error_msg:    msg,
    resp_ticket_id:    '',
    resp_priority:     '',
    resp_sla_deadline: '',
    resp_auto_priority:'false',
  };
}

try {
  const b = JSON.parse(http_body);
  const d = b.data || {};

  return {
    resp_ok:           'true',
    resp_error_code:   '',
    resp_error_msg:    '',
    resp_ticket_id:    String(d.id               || ''),
    resp_priority:     String(d.priority          || ''),
    resp_sla_deadline: String(d.slaDeadline       || ''),
    resp_auto_priority:String(d.priorityAutoAssigned || 'false'),
  };
} catch (e) {
  return {
    resp_ok:           'false',
    resp_error_code:   'PARSE_RESP_FAILED',
    resp_error_msg:    'Resposta inválida do servidor.',
    resp_ticket_id:    '',
    resp_priority:     '',
    resp_sla_deadline: '',
    resp_auto_priority:'false',
  };
}
