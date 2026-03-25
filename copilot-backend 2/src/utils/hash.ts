import { createHash } from 'crypto';

/**
 * Generates a deterministic hash for ticket idempotency checking.
 * Based on customerId + title + description (lowercased + trimmed).
 */
export function generateTicketHash(customerId: string, title: string, description: string): string {
  const normalized = `${customerId.trim().toLowerCase()}|${title.trim().toLowerCase()}|${description.trim().toLowerCase()}`;
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

/**
 * Generates a unique ticket ID.
 */
let ticketCounter = 124; // starts after mock seed data
export function generateTicketId(): string {
  const id = `TKT-${String(ticketCounter++).padStart(5, '0')}`;
  return id;
}
