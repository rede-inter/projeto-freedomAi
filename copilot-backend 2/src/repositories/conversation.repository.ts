import { randomUUID } from 'crypto';
import type { ConversationEvent, RegisterEventDTO } from '../types/index.js';

// In-memory store: conversationId → events[]
const store = new Map<string, ConversationEvent[]>();

export const ConversationRepository = {
  registerEvent(dto: RegisterEventDTO): ConversationEvent {
    const event: ConversationEvent = {
      id: randomUUID(),
      conversationId: dto.conversationId,
      timestamp: new Date().toISOString(),
      intent: dto.intent,
      action: dto.action,
      customerId: dto.customerId ?? null,
      ticketId: dto.ticketId ?? null,
      result: dto.result,
      details: dto.details ?? null,
    };

    const existing = store.get(dto.conversationId) ?? [];
    existing.push(event);
    store.set(dto.conversationId, existing);

    return event;
  },

  findByConversationId(conversationId: string): ConversationEvent[] {
    return store.get(conversationId) ?? [];
  },

  /** Reset store — used in tests */
  _reset(): void {
    store.clear();
  },
};
