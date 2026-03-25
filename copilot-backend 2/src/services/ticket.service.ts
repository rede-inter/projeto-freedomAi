import { TicketRepository } from '../repositories/ticket.repository.js';
import { CustomerRepository } from '../repositories/customer.repository.js';
import { CustomerService } from './customer.service.js';
import { calculatePriority, getSlaHoursForPriority, computeSlaDeadline } from '../utils/priority.js';
import { generateTicketHash, generateTicketId } from '../utils/hash.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import type {
  Ticket,
  TicketPublic,
  CreateTicketDTO,
  EscalateTicketDTO,
  TicketPriority,
} from '../types/index.js';

function toPublic(ticket: Ticket): TicketPublic {
  const { _hash, ...rest } = ticket;
  return rest;
}

/** Default SLA hours when no SLA is found (fallback) */
const DEFAULT_SLA_HOURS: Record<TicketPriority, number> = {
  P1: 2,
  P2: 8,
  P3: 24,
  P4: 72,
};

export const TicketService = {
  listTickets(): TicketPublic[] {
    return TicketRepository.findAll().map(toPublic);
  },

  getTicket(id: string): TicketPublic {
    const ticket = TicketRepository.findById(id);
    if (!ticket) throw new NotFoundError('Ticket', id);
    return toPublic(ticket);
  },

  createTicket(dto: CreateTicketDTO): {
    ticket: TicketPublic;
    priorityAutoAssigned: boolean;
    priorityOverridden: boolean;
  } {
    // 1. Assert customer exists and is active
    CustomerService.assertCustomerActive(dto.customerId);

    // 2. Idempotency check
    const hash = generateTicketHash(dto.customerId, dto.title, dto.description);
    const existing = TicketRepository.findRecentByHash(hash);
    if (existing) {
      throw new ConflictError(
        'DUPLICATE_TICKET',
        `Ticket identico ja foi criado recentemente. Use o ticket existente: ${existing.id}`,
        { existingTicketId: existing.id, existingTicketStatus: existing.status },
      );
    }

    // 3. Determine priority
    const customer = CustomerRepository.findById(dto.customerId)!;
    const sla = CustomerRepository.findSlaByCustomerId(dto.customerId);

    let finalPriority: TicketPriority;
    let priorityAutoAssigned: boolean;
    let priorityOverridden = false;

    const calculated = calculatePriority({
      category: dto.category,
      impactLevel: dto.impactLevel ?? null,
      affectedUsers: dto.affectedUsers ?? 1,
      segment: customer.segment,
    });

    if (dto.priority && ['P1', 'P2', 'P3', 'P4'].includes(dto.priority)) {
      finalPriority = dto.priority;
      priorityAutoAssigned = false;
      priorityOverridden = dto.priority !== calculated.priority;
    } else {
      finalPriority = calculated.priority;
      priorityAutoAssigned = true;
    }

    // 4. Compute SLA deadline
    const slaHours = sla
      ? getSlaHoursForPriority(finalPriority, sla)
      : DEFAULT_SLA_HOURS[finalPriority];
    const slaDeadline = computeSlaDeadline(finalPriority, slaHours);

    // 5. Build ticket
    const now = new Date().toISOString();
    const ticket: Ticket = {
      id: generateTicketId(),
      customerId: dto.customerId,
      title: dto.title,
      description: dto.description,
      category: dto.category,
      priority: finalPriority,
      priorityAutoAssigned,
      priorityOverridden,
      status: 'open',
      assignee: null,
      escalated: false,
      escalationReason: null,
      escalatedBy: null,
      escalatedAt: null,
      reporterEmail: dto.reporterEmail,
      affectedUsers: dto.affectedUsers ?? 1,
      impactLevel: dto.impactLevel ?? null,
      slaDeadline,
      tags: dto.tags ?? [],
      createdAt: now,
      updatedAt: now,
      _hash: hash,
    };

    const created = TicketRepository.create(ticket);
    return { ticket: toPublic(created), priorityAutoAssigned, priorityOverridden };
  },

  escalateTicket(ticketId: string, dto: EscalateTicketDTO): TicketPublic {
    // 1. Ticket must exist
    const ticket = TicketRepository.findById(ticketId);
    if (!ticket) throw new NotFoundError('Ticket', ticketId);

    // 2. Cannot escalate closed/resolved tickets
    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      throw new ConflictError(
        'TICKET_CLOSED',
        `Ticket '${ticketId}' esta com status '${ticket.status}' e nao pode ser escalado.`,
        { currentStatus: ticket.status },
      );
    }

    // 3. Cannot escalate already-escalated tickets
    if (ticket.escalated) {
      throw new ConflictError(
        'ALREADY_ESCALATED',
        `Ticket '${ticketId}' ja foi escalado anteriormente.`,
        {
          escalatedAt: ticket.escalatedAt,
          escalatedBy: ticket.escalatedBy,
        },
      );
    }

    // 4. Resolve new priority
    const newPriority = dto.newPriority ?? ticket.priority;

    // 5. Recompute SLA deadline if priority changed
    let slaDeadline = ticket.slaDeadline;
    if (newPriority !== ticket.priority) {
      const sla = CustomerRepository.findSlaByCustomerId(ticket.customerId);
      const slaHours = sla
        ? getSlaHoursForPriority(newPriority, sla)
        : DEFAULT_SLA_HOURS[newPriority];
      slaDeadline = computeSlaDeadline(newPriority, slaHours);
    }

    const now = new Date().toISOString();
    const updated = TicketRepository.update(ticketId, {
      escalated: true,
      escalationReason: dto.justification,
      escalatedBy: dto.requestedBy,
      escalatedAt: now,
      priority: newPriority,
      slaDeadline,
      updatedAt: now,
    });

    return toPublic(updated!);
  },
};
