// ============================================================
// Code Node: guardrail_create (N32)
// Nó: Hard guardrail antes de POST /v1/ticket
//     Executado APÓS parse_create_slots
//     100% determinístico — sem LLM
//
// INPUTS: slots_* (outputs do parse_create_slots)
// OUTPUTS:
//   - guard_ok            : string ('true' | 'false')
//   - guard_errors        : string (erros concatenados com ' | ')
//   - guard_missing_fields: string (JSON array de campos inválidos)
// ============================================================

const errors  = [];
const missing = [];

// 1. customerId
if (!slots_customer_id || slots_customer_id.trim() === '') {
  errors.push('customerId ausente');
  missing.push('customerId');
} else if (!/^CUST-[A-Z0-9]{1,10}$/.test(slots_customer_id.trim())) {
  errors.push('customerId com formato inválido (esperado: CUST-NNN)');
  missing.push('customerId');
}

// 2. title
const title = (slots_title || '').trim();
if (title.length === 0) {
  errors.push('title ausente');
  missing.push('title');
} else if (title.length < 10) {
  errors.push('title muito curto: ' + title.length + ' chars (mínimo: 10)');
  missing.push('title');
} else if (title.length > 120) {
  errors.push('title muito longo: ' + title.length + ' chars (máximo: 120)');
  missing.push('title');
}

// 3. description
const desc = (slots_desc || '').trim();
if (desc.length === 0) {
  errors.push('description ausente');
  missing.push('description');
} else if (desc.length < 30) {
  errors.push('description muito curta: ' + desc.length + ' chars (mínimo: 30)');
  missing.push('description');
}

// 4. category
const VALID_CAT = ['bug', 'feature', 'question', 'outage'];
if (!slots_category || !VALID_CAT.includes(slots_category)) {
  errors.push('category inválida ou ausente: ' + (slots_category || 'vazio'));
  missing.push('category');
}

// 5. reporterEmail
const email    = (slots_email || '').trim();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
if (!EMAIL_RE.test(email)) {
  errors.push('reporterEmail inválido: ' + (email || 'vazio'));
  missing.push('reporterEmail');
}

if (errors.length > 0) {
  return {
    guard_ok:             'false',
    guard_errors:         errors.join(' | '),
    guard_missing_fields: JSON.stringify(missing),
  };
}

return {
  guard_ok:             'true',
  guard_errors:         '',
  guard_missing_fields: '[]',
};
