import { z } from 'zod';

const CUSTOMER_ID_REGEX = /^CUST-[A-Z0-9]{1,10}$/;

export const TriageSchema = z
  .object({
    customerId: z
      .string()
      .trim()
      .regex(CUSTOMER_ID_REGEX, 'customerId invalido. Formato esperado: CUST-NNN'),

    category: z.enum(['bug', 'feature', 'question', 'outage'], {
      errorMap: () => ({ message: 'category deve ser: bug | feature | question | outage' }),
    }),

    impactLevel: z.enum(['low', 'medium', 'high', 'critical'], {
      errorMap: () => ({ message: 'impactLevel deve ser: low | medium | high | critical' }),
    }),

    affectedUsers: z
      .number()
      .int()
      .min(0)
      .default(1)
      .transform((v) => Math.max(1, v)),

    description: z
      .string()
      .trim()
      .min(20, 'description deve ter no minimo 20 caracteres'),
  })
  .strict();

export type TriageInput = z.infer<typeof TriageSchema>;
