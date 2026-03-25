import type { FastifyRequest, FastifyReply } from 'fastify';
import { TriageService } from '../services/triage.service.js';
import { TriageSchema } from '../validators/triage.validator.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { AppError } from '../utils/errors.js';

export const TriageController = {
  async triage(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const requestId: string = (request as any).requestId;

    const bodyResult = TriageSchema.safeParse(request.body);
    if (!bodyResult.success) {
      const details = bodyResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      sendError(
        reply,
        400,
        'VALIDATION_ERROR',
        'Dados invalidos para triagem',
        requestId,
        details,
      );
      return;
    }

    try {
      const result = TriageService.triage(bodyResult.data);

      request.log.info(
        {
          requestId,
          customerId: bodyResult.data.customerId,
          suggestedPriority: result.suggestedPriority,
          category: bodyResult.data.category,
        },
        'triage.completed',
      );

      sendSuccess(reply, result);
    } catch (err) {
      if (err instanceof AppError) {
        sendError(reply, err.statusCode, err.code, err.message, requestId, err.details);
      } else {
        throw err;
      }
    }
  },
};
