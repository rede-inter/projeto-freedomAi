import type { FastifyInstance } from 'fastify';
import { CustomerController } from '../controllers/customer.controller.js';
import { CustomerService } from '../services/customer.service.js';
import { CustomerIdParamSchema } from '../validators/customer.validator.js';
import { simulateMiddleware } from '../middlewares/simulate.middleware.js';
import { apiKeyAuth } from '../middlewares/auth.middleware.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { AppError } from '../utils/errors.js';

export async function customerRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', apiKeyAuth);

  // ── List routes (static URLs — Dify compatible) ──────────────────────────

  fastify.get('/v1/customers', { preHandler: simulateMiddleware }, async (request, reply) => {
    const requestId: string = (request as any).requestId;
    try {
      const customers = CustomerService.listCustomers();
      request.log.info({ requestId, count: customers.length }, 'customers.list');
      sendSuccess(reply, customers);
    } catch (err) {
      if (err instanceof AppError) sendError(reply, err.statusCode, err.code, err.message, requestId, err.details);
      else throw err;
    }
  });

  fastify.get('/v1/customers/sla', { preHandler: simulateMiddleware }, async (request, reply) => {
    const requestId: string = (request as any).requestId;
    try {
      const slas = CustomerService.listCustomerSlas();
      request.log.info({ requestId, count: slas.length }, 'customers.sla.list');
      sendSuccess(reply, slas);
    } catch (err) {
      if (err instanceof AppError) sendError(reply, err.statusCode, err.code, err.message, requestId, err.details);
      else throw err;
    }
  });

  // Path param routes (curl / direct API)
  fastify.get<{ Params: { id: string }; Querystring: { simulate?: any } }>(
    '/v1/customer/:id',
    { preHandler: simulateMiddleware },
    CustomerController.getCustomer,
  );

  fastify.get<{ Params: { id: string }; Querystring: { simulate?: any } }>(
    '/v1/customer/:id/sla',
    { preHandler: simulateMiddleware },
    CustomerController.getCustomerSla,
  );

  // Query param routes (Dify chatflow — URL path params causam fragmento de URL no Dify)
  fastify.get<{ Querystring: { customerId?: string; simulate?: any } }>(
    '/v1/customer',
    { preHandler: simulateMiddleware },
    async (request, reply) => {
      const requestId: string = (request as any).requestId;
      const id = String(request.query.customerId || '').trim().toUpperCase();
      const result = CustomerIdParamSchema.safeParse({ id });
      if (!result.success) {
        const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
        sendError(reply, 400, 'INVALID_CUSTOMER_ID', 'ID de cliente invalido', requestId, details);
        return;
      }
      try {
        const customer = CustomerService.getCustomer(result.data.id);
        request.log.info({ requestId, customerId: result.data.id }, 'customer.get');
        sendSuccess(reply, customer);
      } catch (err) {
        if (err instanceof AppError) sendError(reply, err.statusCode, err.code, err.message, requestId, err.details);
        else throw err;
      }
    },
  );

  fastify.get<{ Querystring: { customerId?: string; simulate?: any } }>(
    '/v1/customer/sla',
    { preHandler: simulateMiddleware },
    async (request, reply) => {
      const requestId: string = (request as any).requestId;
      const id = String(request.query.customerId || '').trim().toUpperCase();
      const result = CustomerIdParamSchema.safeParse({ id });
      if (!result.success) {
        const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
        sendError(reply, 400, 'INVALID_CUSTOMER_ID', 'ID de cliente invalido', requestId, details);
        return;
      }
      try {
        const sla = CustomerService.getCustomerSla(result.data.id);
        request.log.info({ requestId, customerId: result.data.id }, 'customer.sla.get');
        sendSuccess(reply, sla);
      } catch (err) {
        if (err instanceof AppError) sendError(reply, err.statusCode, err.code, err.message, requestId, err.details);
        else throw err;
      }
    },
  );
}
