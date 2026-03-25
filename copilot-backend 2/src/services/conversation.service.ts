import { ConversationRepository } from '../repositories/conversation.repository.js';
import { NotFoundError } from '../utils/errors.js';
import type { ConversationEvent, ConversationSummary, RegisterEventDTO } from '../types/index.js';

export const ConversationService = {
  registerEvent(dto: RegisterEventDTO): ConversationEvent {
    return ConversationRepository.registerEvent(dto);
  },

  getSummary(conversationId: string): ConversationSummary {
    const events = ConversationRepository.findByConversationId(conversationId);

    if (events.length === 0) {
      throw new NotFoundError('Conversa', conversationId);
    }

    const customersConsulted = [
      ...new Set(
        events
          .filter((e) => e.customerId && ['GET_CUSTOMER', 'GET_SLA', 'CREATE_TICKET', 'TRIAGE'].includes(e.intent))
          .map((e) => e.customerId as string),
      ),
    ];

    const ticketsConsulted = [
      ...new Set(
        events
          .filter((e) => e.ticketId && e.intent === 'GET_TICKET')
          .map((e) => e.ticketId as string),
      ),
    ];

    const ticketsCreated = [
      ...new Set(
        events
          .filter((e) => e.ticketId && e.intent === 'CREATE_TICKET' && e.result === 'success')
          .map((e) => e.ticketId as string),
      ),
    ];

    const ticketsEscalated = [
      ...new Set(
        events
          .filter((e) => e.ticketId && e.intent === 'ESCALATE_TICKET' && e.result === 'success')
          .map((e) => e.ticketId as string),
      ),
    ];

    const triagePerformed = events.some((e) => e.intent === 'TRIAGE' && e.result === 'success');

    const summaryParts: string[] = [];
    if (customersConsulted.length > 0) summaryParts.push(`Clientes consultados: ${customersConsulted.join(', ')}`);
    if (ticketsConsulted.length > 0) summaryParts.push(`Tickets consultados: ${ticketsConsulted.join(', ')}`);
    if (ticketsCreated.length > 0) summaryParts.push(`Tickets criados: ${ticketsCreated.join(', ')}`);
    if (ticketsEscalated.length > 0) summaryParts.push(`Tickets escalados: ${ticketsEscalated.join(', ')}`);
    if (triagePerformed) summaryParts.push('Triagem realizada');
    if (summaryParts.length === 0) summaryParts.push('Nenhuma acao concluida com sucesso');

    return {
      conversationId,
      startedAt: events[0].timestamp,
      updatedAt: events[events.length - 1].timestamp,
      totalEvents: events.length,
      customersConsulted,
      ticketsConsulted,
      ticketsCreated,
      ticketsEscalated,
      triagePerformed,
      events,
      summary: summaryParts.join(' | '),
    };
  },
};
