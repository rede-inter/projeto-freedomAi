import { CustomerRepository } from '../repositories/customer.repository.js';
import { CustomerService } from './customer.service.js';
import { calculatePriority, getSlaHoursForPriority } from '../utils/priority.js';
import { NotFoundError } from '../utils/errors.js';
import type { TriageDTO, TriageResult, TicketPriority } from '../types/index.js';

const DEFAULT_SLA_HOURS: Record<TicketPriority, number> = {
  P1: 2,
  P2: 8,
  P3: 24,
  P4: 72,
};

function buildRecommendedActions(
  priority: TicketPriority,
  category: string,
  segment: string,
  accountManager: string,
): string[] {
  const actions: string[] = [];

  if (priority === 'P1') {
    actions.push(`Abrir ticket P1 imediatamente`);
    actions.push(`Notificar gerente de conta: ${accountManager}`);
    actions.push('Escalar para time de infraestrutura / produto conforme categoria');
    if (category === 'outage') {
      actions.push('Iniciar bridge de incidente com stakeholders');
      actions.push('Comunicar status page do cliente se aplicavel');
    }
  } else if (priority === 'P2') {
    actions.push('Abrir ticket P2 com descricao detalhada');
    actions.push(`Notificar gerente de conta: ${accountManager}`);
    actions.push('Atribuir ao time tecnico especializado');
  } else if (priority === 'P3') {
    actions.push('Abrir ticket P3 para acompanhamento');
    actions.push('Incluir na fila de atendimento normal');
  } else {
    actions.push('Abrir ticket P4 — sem urgencia imediata');
    actions.push('Incluir na proxima sprint de suporte');
  }

  if (segment === 'enterprise') {
    actions.push('Cliente enterprise — monitorar SLA ativamente');
  }

  return actions;
}

function buildSummary(dto: TriageDTO, priority: TicketPriority, customerName: string): string {
  return (
    `Cliente ${customerName} (${dto.customerId}) reporta ${dto.category === 'outage' ? 'indisponibilidade' : dto.category} ` +
    `com impacto ${dto.impactLevel} afetando ${dto.affectedUsers} usuario(s). ` +
    `Prioridade sugerida: ${priority}. ` +
    `Descricao: ${dto.description.slice(0, 120)}${dto.description.length > 120 ? '...' : ''}`
  );
}

export const TriageService = {
  triage(dto: TriageDTO): TriageResult {
    // 1. Customer must exist (not necessarily active for triage)
    const customer = CustomerRepository.findById(dto.customerId);
    if (!customer) throw new NotFoundError('Customer', dto.customerId);

    const sla = CustomerRepository.findSlaByCustomerId(dto.customerId);

    // 2. Calculate priority
    const { priority, reason } = calculatePriority({
      category: dto.category,
      impactLevel: dto.impactLevel,
      affectedUsers: dto.affectedUsers,
      segment: customer.segment,
    });

    // 3. SLA response hours for this priority
    const slaResponseHours = sla
      ? getSlaHoursForPriority(priority, sla)
      : DEFAULT_SLA_HOURS[priority];

    // 4. Build recommended actions
    const recommendedActions = buildRecommendedActions(
      priority,
      dto.category,
      customer.segment,
      customer.accountManager,
    );

    // 5. Build summary
    const summary = buildSummary(dto, priority, customer.name);

    return {
      suggestedPriority: priority,
      priorityReason: reason,
      slaResponseHours,
      recommendedActions,
      summary,
    };
  },
};
