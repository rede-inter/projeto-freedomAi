import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../src/app.js';
import { TicketRepository } from '../../src/repositories/ticket.repository.js';
import type { FastifyInstance } from 'fastify';

const API_KEY = 'dev-secret-key-change-in-production';

let app: FastifyInstance;

beforeAll(async () => {
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  TicketRepository._reset();
});

// ── GET /v1/ticket/:id ────────────────────────────────────────────────────────
describe('GET /v1/ticket/:id', () => {
  it('returns existing ticket', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/ticket/TKT-00001',
      headers: { 'x-api-key': API_KEY },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('TKT-00001');
    expect(body.data.customerId).toBe('CUST-001');
    expect(body.data).not.toHaveProperty('_hash');
  });

  it('returns 404 for unknown ticket', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/ticket/TKT-99999',
      headers: { 'x-api-key': API_KEY },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('TICKET_NOT_FOUND');
  });

  it('returns 400 for invalid ticket ID format', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/ticket/INVALID',
      headers: { 'x-api-key': API_KEY },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_TICKET_ID');
  });
});

// ── POST /v1/ticket ───────────────────────────────────────────────────────────
describe('POST /v1/ticket', () => {
  const validPayload = {
    customerId: 'CUST-001',
    title: 'Erro critico no modulo de login',
    description:
      'Usuarios nao conseguem fazer login no sistema desde as 10h. Impacto em toda a base.',
    category: 'bug',
    reporterEmail: 'ti@empresa.com.br',
    affectedUsers: 200,
    impactLevel: 'high',
  };

  it('creates a ticket and returns 201 with auto-calculated priority', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ticket',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: validPayload,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toMatch(/^TKT-/);
    expect(body.data.customerId).toBe('CUST-001');
    expect(body.data.status).toBe('open');
    expect(body.data.escalated).toBe(false);
    expect(body.data.slaDeadline).toBeTruthy();
    expect(body.data.priorityAutoAssigned).toBe(true);
    expect(body.data.message).toBe('Ticket criado com sucesso.');
    expect(body.data).not.toHaveProperty('_hash');
  });

  it('uses provided priority and sets priorityOverridden=true when different from calculated', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ticket',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: { ...validPayload, priority: 'P4' }, // calculated would be P2
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.priority).toBe('P4');
    expect(body.data.priorityAutoAssigned).toBe(false);
    expect(body.data.priorityOverridden).toBe(true);
  });

  it('auto-assigns P1 for outage + critical impact', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ticket',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: {
        customerId: 'CUST-001',
        title: 'Checkout fora do ar em producao',
        description:
          'Sistema de checkout completamente indisponivel. Todas as transacoes estao falhando desde as 14h.',
        category: 'outage',
        reporterEmail: 'ops@empresa.com.br',
        impactLevel: 'critical',
        affectedUsers: 500,
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().data.priority).toBe('P1');
  });

  it('auto-assigns P4 for question category', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ticket',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: {
        customerId: 'CUST-002',
        title: 'Como exportar relatorio em PDF',
        description:
          'Preciso de orientacao sobre como exportar o relatorio mensal em formato PDF pelo sistema.',
        category: 'question',
        reporterEmail: 'user@betatec.com.br',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().data.priority).toBe('P4');
  });

  it('returns 409 on duplicate ticket within 5 minutes (idempotency)', async () => {
    // First creation
    const first = await app.inject({
      method: 'POST',
      url: '/v1/ticket',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: validPayload,
    });
    expect(first.statusCode).toBe(201);
    const firstId = first.json().data.id;

    // Same payload again immediately
    const second = await app.inject({
      method: 'POST',
      url: '/v1/ticket',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: validPayload,
    });

    expect(second.statusCode).toBe(409);
    const body = second.json();
    expect(body.error.code).toBe('DUPLICATE_TICKET');
    expect(body.error.details.existingTicketId).toBe(firstId);
  });

  it('returns 400 when title is too short', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ticket',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: { ...validPayload, title: 'curto' },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    const titleError = body.error.details.find((d: any) => d.field === 'title');
    expect(titleError).toBeDefined();
  });

  it('returns 400 when description is too short', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ticket',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: { ...validPayload, description: 'curta demais' },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    const descError = body.error.details.find((d: any) => d.field === 'description');
    expect(descError).toBeDefined();
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ticket',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: { customerId: 'CUST-001' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid category', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ticket',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: { ...validPayload, category: 'invalid-cat' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ticket',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: { ...validPayload, reporterEmail: 'not-an-email' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 404 for non-existent customer', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ticket',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: { ...validPayload, customerId: 'CUST-999' },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('CUSTOMER_NOT_FOUND');
  });

  it('returns 403 when customer is suspended', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ticket',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: { ...validPayload, customerId: 'CUST-004' },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('FORBIDDEN');
  });

  it('trims description with only spaces and rejects as too short', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ticket',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: { ...validPayload, description: '   ' },
    });

    expect(res.statusCode).toBe(400);
  });
});

// ── POST /v1/ticket/:id/escalate ──────────────────────────────────────────────
describe('POST /v1/ticket/:id/escalate', () => {
  const validEscalation = {
    justification: 'Impacto critico em producao com 500 usuarios afetados. Necessita atencao imediata.',
    requestedBy: 'gerente@empresa.com.br',
    newPriority: 'P1',
  };

  it('escalates an open ticket successfully', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ticket/TKT-00001/escalate',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: validEscalation,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.escalated).toBe(true);
    expect(body.data.escalationReason).toBe(validEscalation.justification);
    expect(body.data.escalatedBy).toBe(validEscalation.requestedBy);
    expect(body.data.escalatedAt).toBeTruthy();
    expect(body.data.priority).toBe('P1');
  });

  it('returns 409 when trying to escalate an already-escalated ticket', async () => {
    // TKT-00003 is already escalated in seed data
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ticket/TKT-00003/escalate',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: validEscalation,
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('ALREADY_ESCALATED');
  });

  it('returns 409 when trying to escalate a closed ticket', async () => {
    // TKT-00005 is closed in seed data
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ticket/TKT-00005/escalate',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: validEscalation,
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('TICKET_CLOSED');
  });

  it('returns 409 when trying to escalate a resolved ticket', async () => {
    // TKT-00004 is resolved
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ticket/TKT-00004/escalate',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: validEscalation,
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('TICKET_CLOSED');
  });

  it('returns 400 when justification is too short', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ticket/TKT-00001/escalate',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: { ...validEscalation, justification: 'curta' },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    const jField = body.error.details.find((d: any) => d.field === 'justification');
    expect(jField).toBeDefined();
  });

  it('returns 400 when justification is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ticket/TKT-00001/escalate',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: { requestedBy: 'gerente@empresa.com.br' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 404 for non-existent ticket', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ticket/TKT-99999/escalate',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: validEscalation,
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('TICKET_NOT_FOUND');
  });

  it('escalates without changing priority when newPriority is omitted', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ticket/TKT-00001/escalate',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: {
        justification: 'Situacao critica que requer atencao imediata do time tecnico senior.',
        requestedBy: 'suporte@empresa.com.br',
      },
    });

    expect(res.statusCode).toBe(200);
    // TKT-00001 is P2, no newPriority sent — should remain P2
    expect(res.json().data.priority).toBe('P2');
  });
});
