import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('Health endpoints', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(typeof body.uptime).toBe('number');
    expect(body.version).toBe('1.0.0');
  });

  it('GET /ready returns 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(200);
    expect(res.json().ready).toBe(true);
  });

  it('unknown route returns 404 with structured error', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/unknown' });
    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
