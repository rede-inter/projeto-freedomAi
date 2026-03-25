import type { Ticket } from '../types/index.js';
import { TICKETS_SEED } from '../mocks/tickets.mock.js';

// In-memory store
let ticketsStore: Ticket[] = [...TICKETS_SEED];

/** Window (ms) for idempotency checks */
const IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export const TicketRepository = {
  findById(id: string): Ticket | undefined {
    return ticketsStore.find((t) => t.id === id);
  },

  findAll(): Ticket[] {
    return [...ticketsStore];
  },

  findByCustomerId(customerId: string): Ticket[] {
    return ticketsStore.filter((t) => t.customerId === customerId);
  },

  /**
   * Finds an existing ticket with the same hash created within the idempotency window.
   */
  findRecentByHash(hash: string): Ticket | undefined {
    const cutoff = Date.now() - IDEMPOTENCY_WINDOW_MS;
    return ticketsStore.find(
      (t) => t._hash === hash && new Date(t.createdAt).getTime() > cutoff,
    );
  },

  create(ticket: Ticket): Ticket {
    ticketsStore.push(ticket);
    return ticket;
  },

  update(id: string, updates: Partial<Ticket>): Ticket | undefined {
    const index = ticketsStore.findIndex((t) => t.id === id);
    if (index === -1) return undefined;
    ticketsStore[index] = {
      ...ticketsStore[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return ticketsStore[index];
  },

  /** Reset store to seed — used in tests */
  _reset(): void {
    ticketsStore = [...TICKETS_SEED];
  },
};
