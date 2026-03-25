// ============================================================
// Code Node: parse_confirm (N35)
// Nó: Normalização de confirmação (sim/não) — 100% determinístico
//
// INPUT:  user_query (string — resposta do agente ao Question Node)
// OUTPUT:
//   - confirm_result : string ('YES' | 'NO' | 'AMBIGUOUS')
// ============================================================

const YES = [
  /^s(im)?$/i,
  /^y(es)?$/i,
  /^ok(ay)?$/i,
  /^confirmo?$/i,
  /^pode$/i,
  /^certo$/i,
  /^vai$/i,
  /^claro$/i,
  /^com certeza$/i,
  /^pode ser$/i,
  /^afirmativo$/i,
  /\bsim\b/i,
  /\bconfirm/i,
];

const NO = [
  /^n(ao|ão|o)?$/i,
  /^cancel/i,
  /^nop(e)?$/i,
  /^pare$/i,
  /^volta$/i,
  /^desist/i,
  /^negativo$/i,
  /^nao quero$/i,
  /^não quero$/i,
  /^esquece$/i,
  /\bnao\b/i,
  /\bnão\b/i,
];

const reply = (user_query || '').trim();

if (YES.some(function (p) { return p.test(reply); })) {
  return { confirm_result: 'YES' };
}

if (NO.some(function (p) { return p.test(reply); })) {
  return { confirm_result: 'NO' };
}

// Resposta ambígua — não assume nenhuma direção
return { confirm_result: 'AMBIGUOUS' };
