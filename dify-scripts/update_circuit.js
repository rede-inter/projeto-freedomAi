// ============================================================
// Code Node: update_circuit (final de cada Code Node de POST)
// Nó: Atualiza contador do circuit breaker após cada tentativa HTTP
//     Adicionar ao final de copilot_http_post antes do return
//
// INPUTS:
//   - http_ok                  : boolean
//   - cv_consecutive_failures  : string (contador atual)
//
// OUTPUT (para Variable Assigner):
//   - new_consecutive_failures : string (novo valor do contador)
// ============================================================

if (http_ok) {
  // Sucesso: reset do circuit breaker
  return { new_consecutive_failures: '0' };
}

// Falha: incrementa contador
const current = parseInt(cv_consecutive_failures || '0', 10);
return { new_consecutive_failures: String(current + 1) };

// Após este Code Node, usar Variable Assigner para:
//   cv_consecutive_failures = new_consecutive_failures
