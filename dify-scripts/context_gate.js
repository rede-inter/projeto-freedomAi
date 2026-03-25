// ============================================================
// Code Node: context_gate (antes de N34 confirm_create)
// Nó: Verificação de consistência de contexto antes de ações críticas
//     Previne ações no cliente errado quando contexto persiste entre turnos
//
// INPUTS:
//   - merged_customer_id  : string (ID após merge_context)
//   - parsed_customer_id  : string (ID extraído da mensagem ATUAL — pode ser '')
//   - slots_customer_id   : string (ID nos slots de criação)
//
// OUTPUTS:
//   - context_ok       : string ('true' | 'false')
//   - context_question : string (pergunta ao agente, se necessário)
// ============================================================

const contextId = merged_customer_id || '';
const msgId     = parsed_customer_id || '';
const slotId    = slots_customer_id  || '';

// Caso 1: Mensagem atual não mencionou cliente E há cliente no contexto
// => Confirmar se é o cliente correto
if (msgId === '' && contextId !== '' && slotId === contextId) {
  return {
    context_ok:       'false',
    context_question: 'Vou usar o cliente **' + contextId + '** do atendimento anterior.' +
      '\n\nEste é o cliente correto para este ticket? (sim/não)',
  };
}

// Caso 2: Mensagem menciona cliente diferente do contexto
// => Alertar sobre a mudança
if (msgId !== '' && contextId !== '' && msgId !== contextId) {
  return {
    context_ok:       'false',
    context_question: 'Atenção: o cliente informado (**' + msgId + '**) é diferente do' +
      ' último atendimento (**' + contextId + '**).' +
      '\n\nConfirma que o cliente é **' + msgId + '**? (sim/não)',
  };
}

// Contexto consistente — prosseguir
return {
  context_ok:       'true',
  context_question: '',
};

// Condition Node após este Code Node:
//   context_ok == 'true'  => N34 confirm_create
//   context_ok != 'true'  => Question Node com context_question como texto
