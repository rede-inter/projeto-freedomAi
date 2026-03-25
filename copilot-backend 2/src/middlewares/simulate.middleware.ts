import type { FastifyRequest, FastifyReply } from 'fastify';
import type { SimulateMode } from '../types/index.js';

const SIMULATE_LATENCY_MS = 3000;
const SIMULATE_TIMEOUT_MS = 6500;

/**
 * Handles ?simulate=timeout|error|latency query param.
 * Must be registered as a preHandler hook on routes that support simulation.
 */
export async function simulateMiddleware(
  request: FastifyRequest<{ Querystring: { simulate?: SimulateMode } }>,
  reply: FastifyReply,
): Promise<void> {
  const mode = request.query.simulate;
  if (!mode) return;

  const requestId = (request as any).requestId ?? 'unknown';

  if (mode === 'timeout') {
    await delay(SIMULATE_TIMEOUT_MS);
    reply.status(504).send({
      success: false,
      error: {
        code: 'UPSTREAM_TIMEOUT',
        message: 'Simulacao de timeout: a requisicao demorou demais para responder.',
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  if (mode === 'error') {
    reply.status(503).send({
      success: false,
      error: {
        code: 'UPSTREAM_UNAVAILABLE',
        message: 'Simulacao de erro: servico externo indisponivel.',
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  if (mode === 'latency') {
    await delay(SIMULATE_LATENCY_MS);
    // continues normally after delay
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
