import type { FastifyInstance } from 'fastify';
import { TriageController } from '../controllers/triage.controller.js';
import { simulateMiddleware } from '../middlewares/simulate.middleware.js';
import { apiKeyAuth } from '../middlewares/auth.middleware.js';

export async function triageRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', apiKeyAuth);

  fastify.post<{ Querystring: { simulate?: any } }>(
    '/v1/triage',
    { preHandler: simulateMiddleware },
    TriageController.triage,
  );
}
