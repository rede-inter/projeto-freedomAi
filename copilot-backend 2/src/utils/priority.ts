import type { ImpactLevel, TicketCategory, TicketPriority, CustomerSegment } from '../types/index.js';

export interface PriorityInput {
  category: TicketCategory;
  impactLevel: ImpactLevel | null | undefined;
  affectedUsers: number;
  segment: CustomerSegment;
}

export interface PriorityResult {
  priority: TicketPriority;
  reason: string;
}

export function calculatePriority(input: PriorityInput): PriorityResult {
  const { category, impactLevel, affectedUsers, segment } = input;
  const users = Math.max(1, affectedUsers || 1);

  if (category === 'outage' && impactLevel === 'critical') {
    return { priority: 'P1', reason: 'Outage critico detectado' };
  }

  if (category === 'outage' && users >= 100) {
    return { priority: 'P1', reason: `Outage afetando ${users} usuarios` };
  }

  if (category === 'outage' && (impactLevel === 'high' || impactLevel === 'medium')) {
    return { priority: 'P2', reason: `Outage com impacto ${impactLevel}` };
  }

  if (category === 'outage') {
    return { priority: 'P2', reason: 'Outage detectado' };
  }

  if (category === 'bug' && impactLevel === 'critical') {
    return { priority: 'P2', reason: 'Bug critico' };
  }

  if (category === 'bug' && impactLevel === 'high') {
    let p: TicketPriority = 'P3';
    if (segment === 'enterprise') p = 'P2';
    return { priority: p, reason: `Bug de alto impacto (cliente ${segment})` };
  }

  if (category === 'feature' || category === 'question') {
    return { priority: 'P4', reason: `Categoria ${category} tem prioridade padrao P4` };
  }

  // Default P3, but enterprise floors at P2 for bugs
  if (segment === 'enterprise' && category === 'bug') {
    return { priority: 'P2', reason: 'Cliente enterprise — piso de prioridade P2 para bugs' };
  }

  return { priority: 'P3', reason: 'Prioridade padrao para categoria e impacto informados' };
}

export function getSlaHoursForPriority(
  priority: TicketPriority,
  sla: { responseTimeP1Hours: number; responseTimeP2Hours: number; responseTimeP3Hours: number; responseTimeP4Hours: number },
): number {
  const map: Record<TicketPriority, number> = {
    P1: sla.responseTimeP1Hours,
    P2: sla.responseTimeP2Hours,
    P3: sla.responseTimeP3Hours,
    P4: sla.responseTimeP4Hours,
  };
  return map[priority];
}

export function computeSlaDeadline(priority: TicketPriority, slaHours: number): string {
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + slaHours);
  return deadline.toISOString();
}
