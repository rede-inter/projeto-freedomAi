import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
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

describe('Failure simulation via ?simulate= query param', () => {
  it('?simulate=error returns 503 UPSTREAM_UNAVAILABLE', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/customer/CUST-001?simulate=error',
      headers: { 'x-api-key': API_KEY },
    });

    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UPSTREAM_UNAVAILABLE');
    expect(body.error.requestId).toBeTruthy();
    expect(body.error.timestamp).toBeTruthy();
  });

  it('?simulate=error on POST /v1/ticket returns 503', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ticket?simulate=error',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: {},
    });

    expect(res.statusCode).toBe(503);
    expect(res.json().error.code).toBe('UPSTREAM_UNAVAILABLE');
  });

  it('?simulate=error on GET /v1/ticket/:id returns 503', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/ticket/TKT-00001?simulate=error',
      headers: { 'x-api-key': API_KEY },
    });

    expect(res.statusCode).toBe(503);
  });

  it('?simulate=error on POST /v1/triage returns 503', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/triage?simulate=error',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      payload: {},
    });

    expect(res.statusCode).toBe(503);
  });

  it('?simulate=timeout returns 504 UPSTREAM_TIMEOUT', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/customer/CUST-001?simulate=timeout',
      headers: { 'x-api-key': API_KEY },
    });

    expect(res.statusCode).toBe(504);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UPSTREAM_TIMEOUT');
  }, 10_000); // generous timeout for the simulate delay

  it('no simulate param = normal behaviour', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/customer/CUST-001',
      headers: { 'x-api-key': API_KEY },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
  });
});
