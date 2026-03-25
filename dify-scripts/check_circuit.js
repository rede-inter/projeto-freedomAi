// ============================================================
// Code Node: check_circuit (antes de qualquer chamada HTTP crítica)
// Nó: Circuit breaker por sessão via conversation variables
//     (Dify Community não suporta estado compartilhado entre sessões)
//
// INPUT:
//   - cv_consecutive_failures : string (número de falhas consecutivas)
//
// OUTPUTS:
//   - circuit_open : string ('true' | 'false')
//   - circuit_msg  : string (mensagem de fallback se open)
// ============================================================

const failures = parseInt(cv_consecutive_failures || '0', 10);

if (failures >= 2) {
  return {
    circuit_open: 'true',
    circuit_msg:  'Backend com instabilidade (' + failures + ' falhas consecutivas). ' +
      'Aguarde 2 minutos antes de tentar novamente.',
  };
}

return {
  circuit_open: 'false',
  circuit_msg:  '',
};

// Condition Node após:
//   circuit_open == 'true'  => Answer Node com circuit_msg
//   circuit_open != 'true'  => prossegue para http_create/escalate/triage
