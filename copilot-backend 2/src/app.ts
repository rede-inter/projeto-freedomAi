import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { randomUUID } from 'crypto';

import { env } from './config/env.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { customerRoutes } from './routes/customer.routes.js';
import { ticketRoutes } from './routes/ticket.routes.js';
import { triageRoutes } from './routes/triage.routes.js';
import { healthRoutes } from './routes/health.routes.js';
import { conversationRoutes } from './routes/conversation.routes.js';

export function buildApp() {
  const app = Fastify({
    bodyLimit: 10 * 1024, // 10kb max payload
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
            },
          }
        : {}),
    },
    // Attach a unique requestId to every request
    genReqId: () => randomUUID(),
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  // ── Security headers ───────────────────────────────────────────────────────
  app.register(helmet, {
    contentSecurityPolicy: false, // REST API — no HTML served
  });

  // ── CORS ───────────────────────────────────────────────────────────────────
  app.register(cors, {
    origin: env.NODE_ENV === 'production' ? false : true,
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  // ── Rate limiting ──────────────────────────────────────────────────────────
  app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    errorResponseBuilder: (_request, context) => ({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Muitas requisicoes. Tente novamente em ${Math.ceil(context.ttl / 1000)} segundos.`,
        requestId: 'rate-limited',
        timestamp: new Date().toISOString(),
      },
    }),
  });

  // ── Request logging hook — attach conversationId ───────────────────────────
  app.addHook('onRequest', async (request) => {
    const conversationId = request.headers['x-conversation-id'] ?? 'none';
    // Merge into the request logger so all log lines from this request include it
    request.log = request.log.child({ conversationId });
    // Also expose requestId as a plain property for controllers
    (request as any).requestId = request.id;
  });

  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTimeMs: Math.round(reply.elapsedTime),
      },
      'request completed',
    );
  });

  // ── Global error handler ───────────────────────────────────────────────────
  app.setErrorHandler(errorHandler);

  // ── 404 handler ───────────────────────────────────────────────────────────
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Rota '${request.method} ${request.url}' nao encontrada.`,
        requestId: (request as any).requestId ?? 'unknown',
        timestamp: new Date().toISOString(),
      },
    });
  });

  // ── Routes ─────────────────────────────────────────────────────────────────
  app.register(healthRoutes);
  app.register(customerRoutes);
  app.register(ticketRoutes);
  app.register(triageRoutes);
  app.register(conversationRoutes);

  return app;
}
