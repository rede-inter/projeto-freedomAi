// ============================================================
// Code Node: copilot_http_post (N37, N43, N52)
// Nó: POST resiliente com retry + timeout real (AbortController)
//
// INPUTS esperados como variáveis de entrada do Code Node:
//   - endpoint  : string  ex: '/v1/ticket'
//   - body_json : string  ex: JSON.stringify({customerId:..., title:...})
//
// OUTPUTS que este Code Node retorna:
//   - http_status  : number
//   - http_body    : string (JSON raw)
//   - http_ok      : boolean
//   - http_error   : string (código de erro ou '')
//   - http_attempts: number
// ============================================================

const BACKEND_URL = env.BACKEND_URL;
const API_KEY     = env.BACKEND_API_KEY;
const CONV_ID     = sys.conversation_id;

const MAX_RETRIES  = 2; // 3 tentativas no total
const TIMEOUTS_MS  = [8000, 8000, 8000];
const BACKOFF_MS   = [0, 1000, 2000]; // espera antes de cada tentativa

// Não faz retry para esses status — erro do cliente, não do servidor
const NO_RETRY_CODES = [400, 401, 403, 404, 409, 422];

async function tryOnce(url, options, timeoutMs) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res  = await fetch(url, { ...options, signal: ctrl.signal });
    const text = await res.text();
    return {
      ok:           res.status >= 200 && res.status < 300,
      status:       res.status,
      body:         text,
      networkError: null,
    };
  } catch (e) {
    return {
      ok:           false,
      status:       e.name === 'AbortError' ? 504 : 503,
      body:         null,
      networkError: e.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

const url     = BACKEND_URL + endpoint;
const options = {
  method:  'POST',
  headers: {
    'Content-Type':      'application/json',
    'X-API-Key':         API_KEY,
    'X-Conversation-Id': CONV_ID,
  },
  body: body_json,
};

let lastResult = null;

for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
  // Backoff antes da tentativa (0ms na primeira)
  if (BACKOFF_MS[attempt] > 0) {
    await new Promise(r => setTimeout(r, BACKOFF_MS[attempt]));
  }

  const result = await tryOnce(url, options, TIMEOUTS_MS[attempt]);
  lastResult   = { ...result, attempts: attempt + 1 };

  // Sucesso
  if (result.ok) break;

  // Erro do cliente: não retenta
  if (NO_RETRY_CODES.includes(result.status)) break;

  // Erro de servidor ou rede: retenta se ainda houver tentativas
  // (loop continua automaticamente)
}

// Extrair código de erro do body se disponível
let errorCode = '';
if (lastResult.body) {
  try {
    const parsed = JSON.parse(lastResult.body);
    errorCode    = parsed?.error?.code || '';
  } catch (_) {}
}

return {
  http_status:   lastResult.status,
  http_body:     lastResult.body || '',
  http_ok:       lastResult.ok,
  http_error:    errorCode || (lastResult.networkError || ''),
  http_attempts: lastResult.attempts,
};
