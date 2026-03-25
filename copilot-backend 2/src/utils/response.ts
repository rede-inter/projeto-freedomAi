import type { FastifyReply } from 'fastify';
import type { ApiSuccess, ApiError } from '../types/index.js';

export function sendSuccess<T>(reply: FastifyReply, data: T, statusCode = 200): void {
  const body: ApiSuccess<T> = { success: true, data };
  reply.status(statusCode).send(body);
}

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  requestId: string,
  details?: unknown,
): void {
  const body: ApiError = {
    success: false,
    error: {
      code,
      message,
      details,
      requestId,
      timestamp: new Date().toISOString(),
    },
  };
  reply.status(statusCode).send(body);
}
