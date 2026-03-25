import type { FastifyInstance } from 'fastify';
import { getAllCircuitSnapshots } from '../infra/resilience/circuitBreaker.js';

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', async (_request, reply) => {
    const circuits = getAllCircuitSnapshots();
    const allHealthy = circuits.every((c) => (c as any).status !== 'open');

    reply.status(allHealthy ? 200 : 503).send({
      status:    allHealthy ? 'ok' : 'degraded',
      uptime:    Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      version:   '1.0.0',
      circuits,
    });
  });

  fastify.get('/ready', async (_request, reply) => {
    reply.send({ ready: true });
  });
}
