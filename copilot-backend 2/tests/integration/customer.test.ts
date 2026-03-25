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

describe('GET /v1/customer/:id', () => {
  it('returns masked customer data for valid ID', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/customer/CUST-001',
      headers: { 'x-api-key': API_KEY, 'x-conversation-id': 'test-conv-1' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('CUST-001');
    expect(body.data.name).toBe('Empresa Alpha Ltda');
    expect(body.data.segment).toBe('enterprise');

    // Sensitive data must be masked
    expect(body.data.email).toMatch(/\*\*\*/);
    expect(body.data.cnpj).toMatch(/\*\*/);
    expect(body.data.phone).toMatch(/\*\*/);

    // Raw values must NOT appear
    expect(body.data.email).not.toBe('operacoes@alpha.com.br');
    expect(body.data.cnpj).not.toBe('12.345.678/0001-90');
  });

  it('returns 404 for non-existent customer', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/customer/CUST-999',
      headers: { 'x-api-key': API_KEY },
    });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('CUSTOMER_NOT_FOUND');
  });

  it('returns 400 for invalid customer ID format', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/customer/invalid-id',
      headers: { 'x-api-key': API_KEY },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error.code).toBe('INVALID_CUSTOMER_ID');
  });

  it('returns 401 without API key', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/customer/CUST-001',
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 with wrong API key', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/customer/CUST-001',
      headers: { 'x-api-key': 'wrong-key' },
    });

    expect(res.statusCode).toBe(401);
  });
});

describe('GET /v1/customer/:id/sla', () => {
  it('returns SLA for active customer', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/customer/CUST-001/sla',
      headers: { 'x-api-key': API_KEY },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.plan).toBe('enterprise');
    expect(body.data.responseTimeP1Hours).toBe(1);
    expect(body.data.supportHours).toBe('24x7');
    expect(body.data.customerId).toBe('CUST-001');
  });

  it('returns slaExpired flag for expired SLA', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/customer/CUST-EXP/sla',
      headers: { 'x-api-key': API_KEY },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.extraFields?.slaExpired).toBe(true);
  });

  it('returns 404 when customer has no SLA', async () => {
    // CUST-999 does not exist
    const res = await app.inject({
      method: 'GET',
      url: '/v1/customer/CUST-999/sla',
      headers: { 'x-api-key': API_KEY },
    });

    expect(res.statusCode).toBe(404);
  });
});
