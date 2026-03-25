import { z } from 'zod';

// ─── Domain enums ─────────────────────────────────────────────────────────────

export const TicketCategorySchema   = z.enum(['bug', 'feature', 'question', 'outage']);
export const TicketPrioritySchema   = z.enum(['P1', 'P2', 'P3', 'P4']);
export const TicketStatusSchema     = z.enum(['open', 'in_progress', 'resolved', 'closed']);
export const ImpactLevelSchema      = z.enum(['low', 'medium', 'high', 'critical']);
export const CustomerSegmentSchema  = z.enum(['enterprise', 'mid', 'smb']);
export const CustomerStatusSchema   = z.enum(['active', 'suspended', 'churned']);
export const SLAPlanSchema          = z.enum(['basic', 'standard', 'premium', 'enterprise']);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CUST_RE  = /^CUST-[A-Z0-9]{1,10}$/;
const TICKET_RE = /^TKT-\d{5}$/;

// ─── Request schemas ──────────────────────────────────────────────────────────

export const CreateTicketRequestSchema = z.object({
  customerId:    z.string().trim().regex(CUST_RE, 'Invalid customerId format (expected CUST-NNN)'),
  title:         z.string().trim().min(10, 'title min 10 chars').max(120, 'title max 120 chars'),
  description:   z.string().trim().min(30, 'description min 30 chars'),
  category:      TicketCategorySchema,
  reporterEmail: z.string().trim().regex(EMAIL_RE, 'Invalid email'),
  priority:      TicketPrioritySchema.optional(),
  affectedUsers: z.number().int().min(0).optional().transform((v) => Math.max(1, v ?? 1)),
  impactLevel:   ImpactLevelSchema.optional().nullable(),
  tags:          z.array(z.string().trim().max(50)).max(10).optional().default([]),
}).strict();

export const EscalateTicketRequestSchema = z.object({
  justification: z.string().trim().min(20, 'justification min 20 chars'),
  requestedBy:   z.string().trim().regex(EMAIL_RE, 'Invalid requestedBy email'),
  newPriority:   TicketPrioritySchema.optional().nullable(),
}).strict();

export const TriageRequestSchema = z.object({
  customerId:    z.string().trim().regex(CUST_RE, 'Invalid customerId format'),
  category:      TicketCategorySchema,
  impactLevel:   ImpactLevelSchema,
  affectedUsers: z.number().int().min(0).default(1).transform((v) => Math.max(1, v)),
  description:   z.string().trim().min(20, 'description min 20 chars'),
}).strict();

export const CustomerIdParamSchema = z.object({
  id: z.string().trim().regex(CUST_RE, 'Invalid customerId format (expected CUST-NNN)'),
});

export const TicketIdParamSchema = z.object({
  id: z.string().trim().regex(TICKET_RE, 'Invalid ticketId format (expected TKT-NNNNN)'),
});

// ─── Response schemas (used to validate what we send) ─────────────────────────

export const TicketPublicSchema = z.object({
  id:                  z.string(),
  customerId:          z.string(),
  title:               z.string(),
  description:         z.string(),
  category:            TicketCategorySchema,
  priority:            TicketPrioritySchema,
  priorityAutoAssigned:z.boolean(),
  priorityOverridden:  z.boolean(),
  status:              TicketStatusSchema,
  assignee:            z.string().nullable(),
  escalated:           z.boolean(),
  escalationReason:    z.string().nullable(),
  escalatedBy:         z.string().nullable(),
  escalatedAt:         z.string().nullable(),
  reporterEmail:       z.string(),
  affectedUsers:       z.number(),
  impactLevel:         ImpactLevelSchema.nullable(),
  slaDeadline:         z.string(),
  tags:                z.array(z.string()),
  createdAt:           z.string(),
  updatedAt:           z.string(),
});

export const CustomerPublicSchema = z.object({
  id:             z.string(),
  name:           z.string(),
  cnpj:           z.string(),      // masked
  email:          z.string(),      // masked
  phone:          z.string(),      // masked
  segment:        CustomerSegmentSchema,
  accountManager: z.string(),
  status:         CustomerStatusSchema,
  contractId:     z.string(),
  createdAt:      z.string(),
});

export const SLAPublicSchema = z.object({
  customerId:           z.string(),
  plan:                 SLAPlanSchema,
  responseTimeP1Hours:  z.number(),
  responseTimeP2Hours:  z.number(),
  responseTimeP3Hours:  z.number(),
  responseTimeP4Hours:  z.number(),
  uptimeGuarantee:      z.number(),
  supportHours:         z.enum(['24x7', '8x5']),
  validFrom:            z.string(),
  validUntil:           z.string(),
  penaltyClause:        z.boolean(),
  penaltyValuePerHour:  z.number().nullable(),
  extraFields:          z.object({
    slaExpired:           z.boolean().optional(),
    outsideSupportWindow: z.boolean().optional(),
  }).optional(),
});

export const TriageResultSchema = z.object({
  suggestedPriority:  TicketPrioritySchema,
  priorityReason:     z.string(),
  slaResponseHours:   z.number(),
  recommendedActions: z.array(z.string()),
  summary:            z.string(),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateTicketRequest   = z.infer<typeof CreateTicketRequestSchema>;
export type EscalateTicketRequest = z.infer<typeof EscalateTicketRequestSchema>;
export type TriageRequest         = z.infer<typeof TriageRequestSchema>;
export type TicketPublic          = z.infer<typeof TicketPublicSchema>;
export type CustomerPublic        = z.infer<typeof CustomerPublicSchema>;
export type SLAPublic             = z.infer<typeof SLAPublicSchema>;
export type TriageResult          = z.infer<typeof TriageResultSchema>;
