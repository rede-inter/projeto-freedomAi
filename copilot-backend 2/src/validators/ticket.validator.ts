import { z } from 'zod';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TICKET_ID_REGEX = /^TKT-\d{5}$/;
const CUSTOMER_ID_REGEX = /^CUST-[A-Z0-9]{1,10}$/;

export const TicketIdParamSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(TICKET_ID_REGEX, 'ID de ticket invalido. Formato esperado: TKT-NNNNN'),
});

export const CreateTicketSchema = z
  .object({
    customerId: z
      .string()
      .trim()
      .regex(CUSTOMER_ID_REGEX, 'customerId invalido. Formato esperado: CUST-NNN'),

    title: z
      .string()
      .trim()
      .min(10, 'title deve ter no minimo 10 caracteres')
      .max(120, 'title deve ter no maximo 120 caracteres'),

    description: z
      .string()
      .trim()
      .min(30, 'description deve ter no minimo 30 caracteres'),

    category: z.enum(['bug', 'feature', 'question', 'outage'], {
      errorMap: () => ({ message: 'category deve ser: bug | feature | question | outage' }),
    }),

    reporterEmail: z
      .string()
      .trim()
      .regex(EMAIL_REGEX, 'reporterEmail deve ser um email valido'),

    priority: z
      .enum(['P1', 'P2', 'P3', 'P4'])
      .optional(),

    affectedUsers: z
      .number()
      .int()
      .min(0)
      .optional()
      .transform((v) => Math.max(1, v ?? 1)),

    impactLevel: z
      .enum(['low', 'medium', 'high', 'critical'])
      .optional()
      .nullable(),

    tags: z
      .array(z.string().trim().max(50))
      .max(10)
      .optional()
      .default([]),
  })
  .strict();

export const EscalateTicketSchema = z
  .object({
    justification: z
      .string()
      .trim()
      .min(20, 'justification deve ter no minimo 20 caracteres'),

    requestedBy: z
      .string()
      .trim()
      .regex(EMAIL_REGEX, 'requestedBy deve ser um email valido'),

    newPriority: z
      .enum(['P1', 'P2', 'P3', 'P4'])
      .optional()
      .nullable(),
  })
  .strict();

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;
export type EscalateTicketInput = z.infer<typeof EscalateTicketSchema>;
export type TicketIdParam = z.infer<typeof TicketIdParamSchema>;
