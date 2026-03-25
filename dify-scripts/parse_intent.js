// ============================================================
// Code Node: parse_intent (N03)
// Nó: Parsing seguro do output do LLM Intent Classifier
//
// INPUT:  llm_output (string — raw output do LLM)
// OUTPUTS:
//   - parsed_intent      : string  (intent normalizado ou 'UNKNOWN')
//   - parsed_confidence  : string  (número entre 0 e 1)
//   - parsed_customer_id : string  (ID extraído ou '')
//   - parsed_ticket_id   : string  (ID extraído ou '')
//   - parse_intent_ok    : string  ('true' | 'false')
//   - parse_intent_err   : string  (mensagem de erro ou '')
// ============================================================

function extractJSON(raw) {
  if (!raw || typeof raw !== 'string') return null;

  // Remove markdown code fences comuns
  let s = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

  // Tenta parse direto
  try { return JSON.parse(s); } catch (_) {}

  // Tenta extrair primeiro objeto JSON válido da string
  const m = s.match(/\{[\s\S]*?\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch (_) {}
  }

  // Tenta extrair último objeto JSON (alguns modelos colocam texto antes)
  const all = [...s.matchAll(/\{[\s\S]*?\}/g)];
  for (let i = all.length - 1; i >= 0; i--) {
    try { return JSON.parse(all[i][0]); } catch (_) {}
  }

  return null;
}

const VALID = [
  'GET_CUSTOMER', 'GET_SLA', 'GET_TICKET',
  'CREATE_TICKET', 'ESCALATE_TICKET', 'TRIAGE', 'UNKNOWN',
];

// Fallback seguro — retornado quando parsing falha completamente
const FALLBACK = {
  parsed_intent:      'UNKNOWN',
  parsed_confidence:  '0',
  parsed_customer_id: '',
  parsed_ticket_id:   '',
  parse_intent_ok:    'false',
  parse_intent_err:   'JSON_PARSE_FAILED',
};

const obj = extractJSON(llm_output);
if (!obj) return FALLBACK;

// Valida e normaliza intent
const rawIntent  = String(obj.intent || '').trim().toUpperCase();
const intent     = VALID.includes(rawIntent) ? rawIntent : 'UNKNOWN';

// Valida confidence
const conf       = parseFloat(obj.confidence);
const confidence = isNaN(conf) ? 0 : Math.min(1, Math.max(0, conf));

// Downgrade para UNKNOWN se confidence baixo
const finalIntent = confidence >= 0.75 ? intent : 'UNKNOWN';

// Normaliza entities — nunca retorna undefined
const ent = obj.entities || {};
function normId(v) {
  if (!v || v === 'null' || v === 'undefined') return '';
  return String(v).trim();
}

return {
  parsed_intent:      finalIntent,
  parsed_confidence:  String(confidence),
  parsed_customer_id: normId(ent.customer_id),
  parsed_ticket_id:   normId(ent.ticket_id),
  parse_intent_ok:    'true',
  parse_intent_err:   '',
};
