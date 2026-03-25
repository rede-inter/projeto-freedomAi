import type { FastifyRequest, FastifyReply } from 'fastify';
import { CustomerService } from '../services/customer.service.js';
import { CustomerIdParamSchema } from '../validators/customer.validator.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { ZodError } from 'zod';

export const CustomerController = {
  async getCustomer(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    const requestId: string = (request as any).requestId;

    // Validate params
    const paramsResult = CustomerIdParamSchema.safeParse(request.params);
    if (!paramsResult.success) {
      const details = paramsResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      sendError(reply, 400, 'INVALID_CUSTOMER_ID', 'ID de cliente invalido', requestId, details);
      return;
    }

    try {
      const customer = CustomerService.getCustomer(paramsResult.data.id);
      request.log.info({ requestId, customerId: paramsResult.data.id }, 'customer.get');
      sendSuccess(reply, customer);
    } catch (err) {
      if (err instanceof AppError) {
        sendError(reply, err.statusCode, err.code, err.message, requestId, err.details);
      } else {
        throw err;
      }
    }
  },

  async getCustomerSla(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    const requestId: string = (request as any).requestId;

    const paramsResult = CustomerIdParamSchema.safeParse(request.params);
    if (!paramsResult.success) {
      const details = paramsResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      sendError(reply, 400, 'INVALID_CUSTOMER_ID', 'ID de cliente invalido', requestId, details);
      return;
    }

    try {
      const sla = CustomerService.getCustomerSla(paramsResult.data.id);
      request.log.info({ requestId, customerId: paramsResult.data.id }, 'customer.sla.get');
      sendSuccess(reply, sla);
    } catch (err) {
      if (err instanceof AppError) {
        sendError(reply, err.statusCode, err.code, err.message, requestId, err.details);
      } else {
        throw err;
      }
    }
  },
};
