import type { FastifyRequest, FastifyReply } from 'fastify';
import { TicketService } from '../services/ticket.service.js';
import {
  TicketIdParamSchema,
  CreateTicketSchema,
  EscalateTicketSchema,
} from '../validators/ticket.validator.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { AppError } from '../utils/errors.js';

export const TicketController = {
  async getTicket(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    const requestId: string = (request as any).requestId;

    const paramsResult = TicketIdParamSchema.safeParse(request.params);
    if (!paramsResult.success) {
      const details = paramsResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      sendError(reply, 400, 'INVALID_TICKET_ID', 'ID de ticket invalido', requestId, details);
      return;
    }

    try {
      const ticket = TicketService.getTicket(paramsResult.data.id);
      request.log.info({ requestId, ticketId: paramsResult.data.id }, 'ticket.get');
      sendSuccess(reply, ticket);
    } catch (err) {
      if (err instanceof AppError) {
        sendError(reply, err.statusCode, err.code, err.message, requestId, err.details);
      } else {
        throw err;
      }
    }
  },

  async createTicket(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const requestId: string = (request as any).requestId;

    const bodyResult = CreateTicketSchema.safeParse(request.body);
    if (!bodyResult.success) {
      const details = bodyResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      sendError(
        reply,
        400,
        'VALIDATION_ERROR',
        'Dados de entrada invalidos para criacao de ticket',
        requestId,
        details,
      );
      return;
    }

    try {
      const { ticket, priorityAutoAssigned, priorityOverridden } = TicketService.createTicket({
        ...bodyResult.data,
        impactLevel: bodyResult.data.impactLevel ?? undefined,
      });

      request.log.info(
        {
          requestId,
          ticketId: ticket.id,
          customerId: ticket.customerId,
          priority: ticket.priority,
          priorityAutoAssigned,
          priorityOverridden,
        },
        'ticket.created',
      );

      sendSuccess(
        reply,
        {
          ...ticket,
          priorityAutoAssigned,
          priorityOverridden,
          message: 'Ticket criado com sucesso.',
        },
        201,
      );
    } catch (err) {
      if (err instanceof AppError) {
        sendError(reply, err.statusCode, err.code, err.message, requestId, err.details);
      } else {
        throw err;
      }
    }
  },

  async escalateTicket(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    const requestId: string = (request as any).requestId;

    const paramsResult = TicketIdParamSchema.safeParse(request.params);
    if (!paramsResult.success) {
      const details = paramsResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      sendError(reply, 400, 'INVALID_TICKET_ID', 'ID de ticket invalido', requestId, details);
      return;
    }

    const bodyResult = EscalateTicketSchema.safeParse(request.body);
    if (!bodyResult.success) {
      const details = bodyResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      sendError(
        reply,
        400,
        'VALIDATION_ERROR',
        'Dados invalidos para escalonamento',
        requestId,
        details,
      );
      return;
    }

    try {
      const ticket = TicketService.escalateTicket(paramsResult.data.id, {
        ...bodyResult.data,
        newPriority: bodyResult.data.newPriority ?? undefined,
      });

      request.log.info(
        {
          requestId,
          ticketId: ticket.id,
          escalatedBy: bodyResult.data.requestedBy,
          newPriority: ticket.priority,
        },
        'ticket.escalated',
      );

      sendSuccess(reply, ticket);
    } catch (err) {
      if (err instanceof AppError) {
        sendError(reply, err.statusCode, err.code, err.message, requestId, err.details);
      } else {
        throw err;
      }
    }
  },
};
