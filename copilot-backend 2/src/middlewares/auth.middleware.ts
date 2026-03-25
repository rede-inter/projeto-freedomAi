import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../utils/errors.js';

export function apiKeyAuth(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction,
): void {
  const key = request.headers['x-api-key'];
  if (!key || key !== env.STUDIO_API_KEY) {
    const err = new UnauthorizedError();
    reply.status(err.statusCode).send({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        requestId: (request as any).requestId ?? 'unknown',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }
  done();
}
