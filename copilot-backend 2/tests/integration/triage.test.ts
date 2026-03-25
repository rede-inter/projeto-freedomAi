import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../src/app.js';
import { CustomerRepository } from '../../src/repositories/customer.repository.js';
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
  CustomerRepository._reset();
});

describe('POST /v1/triage', () => {
  const base = {
    customerId: 'CUST-001',
    category: 'outage',
    impactLevel: 'critical',
    affectedUsers: 500,
    description: 'Sistema de checkout completamente indisponivel desde as 09h de hoje.',
  };

  it('returns P1 for outage + critical + enterprise customer', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/triage',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: base,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.suggestedPriority).toBe('P1');
    expect(body.data.slaResponseHours).toBe(1); // enterprise P1 SLA
    expect(body.data.recommendedActions.length).toBeGreaterThan(0);
    expect(body.data.summary).toContain('CUST-001');
    expect(body.data.priorityReason).toBeTruthy();
  });

  it('returns P4 for question category', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/triage',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: {
        ...base,
        category: 'question',
        impactLevel: 'low',
        affectedUsers: 1,
        description: 'Duvida sobre como configurar o modulo de relatorios do sistema.',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.suggestedPriority).toBe('P4');
  });

  it('returns P2 for bug + high on enterprise customer (floor rule)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/triage',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: {
        ...base,
        category: 'bug',
        impactLevel: 'high',
        affectedUsers: 5,
        description: 'Bug no modulo de relatorios afetando time financeiro durante fechamento.',
      },
    });

    expect(res.statusCode).toBe(200);
    // enterprise + bug + high => P2 (floor)
    expect(res.json().data.suggestedPriority).toBe('P2');
  });

  it('returns 404 for non-existent customer', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/triage',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: { ...base, customerId: 'CUST-999' },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('CUSTOMER_NOT_FOUND');
  });

  it('returns 400 when description is too short', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/triage',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: { ...base, description: 'curta' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid impactLevel', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/triage',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: { ...base, impactLevel: 'extreme' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('treats affectedUsers=0 as 1 and still calculates priority', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/triage',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: { ...base, affectedUsers: 0 },
    });

    // outage + critical → P1 regardless of users
    expect(res.statusCode).toBe(200);
    expect(res.json().data.suggestedPriority).toBe('P1');
  });

  it('includes accountManager in recommended actions for P1', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/triage',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: base,
    });

    const actions: string[] = res.json().data.recommendedActions;
    expect(actions.some((a) => a.includes('Carla Mendes'))).toBe(true);
  });
});
