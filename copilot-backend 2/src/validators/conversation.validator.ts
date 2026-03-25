import { z } from 'zod';

export const RegisterEventSchema = z.object({
  conversationId: z.string().min(1, 'conversationId obrigatorio'),
  intent: z.string().min(1, 'intent obrigatorio'),
  action: z.string().min(1, 'action obrigatorio'),
  customerId: z.string().optional().nullable(),
  ticketId: z.string().optional().nullable(),
  result: z.enum(['success', 'error']),
  details: z.string().optional().nullable(),
});

export const ConversationIdParamSchema = z.object({
  conversationId: z.string().min(1, 'conversationId obrigatorio'),
});
