import { z } from 'zod';

const CUSTOMER_ID_REGEX = /^CUST-[A-Z0-9]{1,10}$/i;

export const CustomerIdParamSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(CUSTOMER_ID_REGEX, 'ID de cliente invalido. Formato esperado: CUST-NNN'),
});

export type CustomerIdParam = z.infer<typeof CustomerIdParamSchema>;
