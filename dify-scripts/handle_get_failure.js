// ============================================================
// Code Node: handle_get_failure
// Nó: Failure branch do HTTP Request Node (GET requests)
//
// INPUT: response do HTTP Request Node em caso de falha
// O Dify passa status_code e body mesmo em falha
//
// OUTPUTS:
//   - get_error_code : string
//   - get_error_msg  : string
//   - get_failed     : boolean
// ============================================================

const status = http_response.status_code || 503;

let errorCode = 'UPSTREAM_UNAVAILABLE';
let errorMsg  = 'Sistema temporariamente indisponível.';

if (status === 504 || status === 0) {
  errorCode = 'UPSTREAM_TIMEOUT';
  errorMsg  = 'O sistema demorou demais para responder.';
}

if (status === 404) {
  errorCode = 'NOT_FOUND';
  try {
    const b  = JSON.parse(http_response.body || '{}');
    errorMsg = b?.error?.message || 'Recurso não encontrado.';
  } catch (_) {}
}

if (status === 401) {
  errorCode = 'UNAUTHORIZED';
  errorMsg  = 'Erro de autenticação com o backend.';
}

return {
  get_error_code: errorCode,
  get_error_msg:  errorMsg,
  get_failed:     true,
};
