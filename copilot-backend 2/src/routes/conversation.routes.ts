import type { FastifyInstance } from 'fastify';
import { ConversationService } from '../services/conversation.service.js';
import { RegisterEventSchema, ConversationIdParamSchema } from '../validators/conversation.validator.js';
import { apiKeyAuth } from '../middlewares/auth.middleware.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { AppError } from '../utils/errors.js';

export async function conversationRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', apiKeyAuth);

  // ── POST /v1/conversation/event — register conversation event ────────────
  fastify.post<{ Querystring: { simulate?: any } }>(
    '/v1/conversation/event',
    async (request, reply) => {
      const requestId: string = (request as any).requestId;
      const body = request.body as any;

      const result = RegisterEventSchema.safeParse(body);
      if (!result.success) {
        const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
        sendError(reply, 400, 'VALIDATION_ERROR', 'Dados invalidos para registro de evento', requestId, details);
        return;
      }

      try {
        const event = ConversationService.registerEvent(result.data);
        request.log.info(
          { requestId, conversationId: result.data.conversationId, intent: result.data.intent },
          'conversation.event.registered',
        );
        sendSuccess(reply, event, 201);
      } catch (err) {
        if (err instanceof AppError) sendError(reply, err.statusCode, err.code, err.message, requestId, err.details);
        else throw err;
      }
    },
  );

  // ── GET /v1/conversation/summary?conversationId=xxx — get summary ────────
  // Dify-compatible: conversationId via query param
  fastify.get<{ Querystring: { conversationId?: string } }>(
    '/v1/conversation/summary',
    async (request, reply) => {
      const requestId: string = (request as any).requestId;
      const conversationId = String(request.query.conversationId || '').trim();

      const result = ConversationIdParamSchema.safeParse({ conversationId });
      if (!result.success) {
        const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
        sendError(reply, 400, 'INVALID_CONVERSATION_ID', 'conversationId invalido ou ausente', requestId, details);
        return;
      }

      try {
        const summary = ConversationService.getSummary(result.data.conversationId);
        request.log.info({ requestId, conversationId }, 'conversation.summary.get');
        sendSuccess(reply, summary);
      } catch (err) {
        if (err instanceof AppError) sendError(reply, err.statusCode, err.code, err.message, requestId, err.details);
        else throw err;
      }
    },
  );
}
