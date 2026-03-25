import type { FastifyInstance } from 'fastify';
import { TicketController } from '../controllers/ticket.controller.js';
import { TicketService } from '../services/ticket.service.js';
import { TicketIdParamSchema, EscalateTicketSchema } from '../validators/ticket.validator.js';
import { simulateMiddleware } from '../middlewares/simulate.middleware.js';
import { apiKeyAuth } from '../middlewares/auth.middleware.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { AppError } from '../utils/errors.js';

export async function ticketRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', apiKeyAuth);

  // ── List route (static URL — Dify compatible) ────────────────────────────

  fastify.get('/v1/tickets', { preHandler: simulateMiddleware }, async (request, reply) => {
    const requestId: string = (request as any).requestId;
    try {
      const tickets = TicketService.listTickets();
      request.log.info({ requestId, count: tickets.length }, 'tickets.list');
      sendSuccess(reply, tickets);
    } catch (err) {
      if (err instanceof AppError) sendError(reply, err.statusCode, err.code, err.message, requestId, err.details);
      else throw err;
    }
  });

  // Path param routes (curl / direct API)
  fastify.get<{ Params: { id: string }; Querystring: { simulate?: any } }>(
    '/v1/ticket/:id',
    { preHandler: simulateMiddleware },
    TicketController.getTicket,
  );

  fastify.post<{ Querystring: { simulate?: any } }>(
    '/v1/ticket',
    { preHandler: simulateMiddleware },
    TicketController.createTicket,
  );

  fastify.post<{ Params: { id: string }; Querystring: { simulate?: any } }>(
    '/v1/ticket/:id/escalate',
    { preHandler: simulateMiddleware },
    TicketController.escalateTicket,
  );

  // Query/body param routes (Dify chatflow)
  fastify.get<{ Querystring: { ticketId?: string; simulate?: any } }>(
    '/v1/ticket',
    { preHandler: simulateMiddleware },
    async (request, reply) => {
      const requestId: string = (request as any).requestId;
      const id = String(request.query.ticketId || '').trim().toUpperCase();
      const result = TicketIdParamSchema.safeParse({ id });
      if (!result.success) {
        const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
        sendError(reply, 400, 'INVALID_TICKET_ID', 'ID de ticket invalido', requestId, details);
        return;
      }
      try {
        const ticket = TicketService.getTicket(result.data.id);
        request.log.info({ requestId, ticketId: result.data.id }, 'ticket.get');
        sendSuccess(reply, ticket);
      } catch (err) {
        if (err instanceof AppError) sendError(reply, err.statusCode, err.code, err.message, requestId, err.details);
        else throw err;
      }
    },
  );

  fastify.post<{ Querystring: { simulate?: any } }>(
    '/v1/ticket/escalate',
    { preHandler: simulateMiddleware },
    async (request, reply) => {
      const requestId: string = (request as any).requestId;
      const body = request.body as any;
      const id = String(body?.ticketId || '').trim().toUpperCase();
      const idResult = TicketIdParamSchema.safeParse({ id });
      if (!idResult.success) {
        const details = idResult.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
        sendError(reply, 400, 'INVALID_TICKET_ID', 'ID de ticket invalido', requestId, details);
        return;
      }
      const { ticketId: _tid, ...escalateBody } = body;
      const bodyResult = EscalateTicketSchema.safeParse(escalateBody);
      if (!bodyResult.success) {
        const details = bodyResult.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
        sendError(reply, 400, 'VALIDATION_ERROR', 'Dados invalidos para escalonamento', requestId, details);
        return;
      }
      try {
        const ticket = TicketService.escalateTicket(idResult.data.id, {
          ...bodyResult.data,
          newPriority: bodyResult.data.newPriority ?? undefined,
        });
        request.log.info({ requestId, ticketId: ticket.id, escalatedBy: bodyResult.data.requestedBy, newPriority: ticket.priority }, 'ticket.escalated');
        sendSuccess(reply, ticket);
      } catch (err) {
        if (err instanceof AppError) sendError(reply, err.statusCode, err.code, err.message, requestId, err.details);
        else throw err;
      }
    },
  );
}
