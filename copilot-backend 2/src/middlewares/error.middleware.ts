import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../utils/errors.js';
import { ZodError } from 'zod';

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const requestId: string = (request as any).requestId ?? 'unknown';
  const log = request.log;

  // Zod validation error (should be caught in controllers, but safety net here)
  if (error instanceof ZodError) {
    const details = error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    log.warn({ requestId, details }, 'Zod validation error in global handler');
    reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados de entrada invalidos',
        details,
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // Known application errors
  if (error instanceof AppError) {
    log.warn({ requestId, code: error.code, message: error.message }, 'Application error');
    reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // Fastify native errors (e.g. 404 from wrong route, 405 method not allowed)
  if ('statusCode' in error && typeof (error as any).statusCode === 'number') {
    const fe = error as FastifyError;
    log.warn({ requestId, statusCode: fe.statusCode, message: fe.message }, 'Fastify error');
    reply.status(fe.statusCode ?? 500).send({
      success: false,
      error: {
        code: fe.code ?? 'REQUEST_ERROR',
        message: fe.message,
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // Unknown / unhandled errors
  log.error({ requestId, err: error }, 'Unhandled error');
  reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Erro interno inesperado. Nossa equipe foi notificada.',
      requestId,
      timestamp: new Date().toISOString(),
    },
  });
}
