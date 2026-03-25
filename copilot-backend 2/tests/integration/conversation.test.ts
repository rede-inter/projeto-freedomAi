import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../../src/app.js';
import { ConversationRepository } from '../../src/repositories/conversation.repository.js';

const API_KEY = 'dev-secret-key-change-in-production';
const headers = { 'x-api-key': API_KEY, 'content-type': 'application/json' };

describe('POST /v1/conversation/event', () => {
  beforeEach(() => ConversationRepository._reset());

  it('registers an event and returns 201', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/conversation/event',
      headers,
      payload: {
        conversationId: 'conv-001',
        intent: 'GET_CUSTOMER',
        action: 'consultar cliente',
        customerId: 'CUST-001',
        result: 'success',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.conversationId).toBe('conv-001');
    expect(body.data.intent).toBe('GET_CUSTOMER');
    expect(body.data.id).toBeDefined();
  });

  it('returns 400 when required fields are missing', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/conversation/event',
      headers,
      payload: { conversationId: 'conv-001' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().success).toBe(false);
  });

  it('returns 401 without API key', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/conversation/event',
      payload: { conversationId: 'conv-001', intent: 'GET_CUSTOMER', action: 'test', result: 'success' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /v1/conversation/summary', () => {
  beforeEach(() => ConversationRepository._reset());

  it('returns summary with aggregated data', async () => {
    const app = buildApp();

    const events = [
      { conversationId: 'conv-002', intent: 'GET_CUSTOMER', action: 'consultar', customerId: 'CUST-001', result: 'success' },
      { conversationId: 'conv-002', intent: 'CREATE_TICKET', action: 'criar ticket', customerId: 'CUST-001', ticketId: 'TKT-00010', result: 'success' },
      { conversationId: 'conv-002', intent: 'ESCALATE_TICKET', action: 'escalar ticket', ticketId: 'TKT-00010', result: 'success' },
    ];

    for (const e of events) {
      await app.inject({ method: 'POST', url: '/v1/conversation/event', headers, payload: e });
    }

    const res = await app.inject({
      method: 'GET',
      url: '/v1/conversation/summary?conversationId=conv-002',
      headers,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.conversationId).toBe('conv-002');
    expect(body.data.totalEvents).toBe(3);
    expect(body.data.customersConsulted).toContain('CUST-001');
    expect(body.data.ticketsCreated).toContain('TKT-00010');
    expect(body.data.ticketsEscalated).toContain('TKT-00010');
    expect(body.data.summary).toContain('CUST-001');
  });

  it('returns 404 for unknown conversationId', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/v1/conversation/summary?conversationId=conv-nao-existe',
      headers,
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 400 when conversationId is missing', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/v1/conversation/summary',
      headers,
    });
    expect(res.statusCode).toBe(400);
  });
});
