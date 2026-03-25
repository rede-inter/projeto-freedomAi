// ============================================================
// Code Node: parse_create_slots (N31)
// Nó: Parsing e validação dos slots de criação de ticket
//
// INPUT:  llm_output (string — raw output do LLM extract_create)
// OUTPUTS:
//   - slots_ok         : string ('true' | 'false')
//   - slots_complete   : string ('true' | 'false')
//   - slots_customer_id: string
//   - slots_title      : string
//   - slots_desc       : string
//   - slots_category   : string
//   - slots_email      : string
//   - slots_affected   : string (número)
//   - slots_impact     : string
//   - slots_tags       : string (JSON array)
//   - slots_missing    : string (JSON array de campos faltantes)
// ============================================================

function extractJSON(raw) {
  if (!raw) return null;
  const s = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(s); } catch (_) {}
  const m = s.match(/\{[\s\S]*?\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch (_) {}
  }
  return null;
}

function normStr(v) {
  if (v === null || v === undefined || v === 'null' || v === 'undefined' || v === '') return '';
  return String(v).trim();
}

// Fallback quando parsing falha
const PARSE_FAIL = {
  slots_ok:          'false',
  slots_complete:    'false',
  slots_customer_id: '',
  slots_title:       '',
  slots_desc:        '',
  slots_category:    '',
  slots_email:       '',
  slots_affected:    '1',
  slots_impact:      '',
  slots_tags:        '[]',
  slots_missing:     '["parse_failed"]',
};

const VALID_CAT = ['bug', 'feature', 'question', 'outage'];
const VALID_IMP = ['low', 'medium', 'high', 'critical'];

const obj = extractJSON(llm_output);
if (!obj) return PARSE_FAIL;

const customerId = normStr(obj.customerId);
const title      = normStr(obj.title);
const desc       = normStr(obj.description);
const category   = VALID_CAT.includes(obj.category) ? obj.category : '';
const email      = normStr(obj.reporterEmail);
const affNum     = parseInt(obj.affectedUsers, 10);
const affected   = (!isNaN(affNum) && affNum > 0) ? String(affNum) : '1';
const impact     = VALID_IMP.includes(obj.impactLevel) ? obj.impactLevel : '';
const tags       = Array.isArray(obj.tags)
  ? JSON.stringify(obj.tags.slice(0, 10).map(t => String(t).trim()))
  : '[]';

const missingRaw = Array.isArray(obj.missing_fields) ? obj.missing_fields : [];

// Recalcula is_complete deterministicamente — não confia no LLM
const isComplete = (
  customerId.length > 0 &&
  title.length >= 10 &&
  title.length <= 120 &&
  desc.length >= 30 &&
  category.length > 0 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
);

return {
  slots_ok:          'true',
  slots_complete:    isComplete ? 'true' : 'false',
  slots_customer_id: customerId,
  slots_title:       title,
  slots_desc:        desc,
  slots_category:    category,
  slots_email:       email,
  slots_affected:    affected,
  slots_impact:      impact,
  slots_tags:        tags,
  slots_missing:     JSON.stringify(missingRaw),
};
