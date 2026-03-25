// ─── Enums ────────────────────────────────────────────────────────────────────

export type TicketCategory = 'bug' | 'feature' | 'question' | 'outage';
export type TicketPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type CustomerSegment = 'enterprise' | 'mid' | 'smb';
export type CustomerStatus = 'active' | 'suspended' | 'churned';
export type SLAPlan = 'basic' | 'standard' | 'premium' | 'enterprise';
export type SupportHours = '24x7' | '8x5';
export type ImpactLevel = 'low' | 'medium' | 'high' | 'critical';

// ─── Domain Models ────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  segment: CustomerSegment;
  accountManager: string;
  status: CustomerStatus;
  contractId: string;
  createdAt: string;
}

export interface CustomerPublic extends Omit<Customer, 'cnpj' | 'email' | 'phone'> {
  cnpj: string;    // masked
  email: string;   // masked
  phone: string;   // masked
}

export interface SLA {
  customerId: string;
  plan: SLAPlan;
  responseTimeP1Hours: number;
  responseTimeP2Hours: number;
  responseTimeP3Hours: number;
  responseTimeP4Hours: number;
  uptimeGuarantee: number;
  supportHours: SupportHours;
  validFrom: string;
  validUntil: string;
  penaltyClause: boolean;
  penaltyValuePerHour: number | null;
}

export interface SLAPublic extends SLA {
  extraFields?: {
    slaExpired?: boolean;
    outsideSupportWindow?: boolean;
  };
}

export interface Ticket {
  id: string;
  customerId: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  priorityAutoAssigned: boolean;
  priorityOverridden: boolean;
  status: TicketStatus;
  assignee: string | null;
  escalated: boolean;
  escalationReason: string | null;
  escalatedBy: string | null;
  escalatedAt: string | null;
  reporterEmail: string;
  affectedUsers: number;
  impactLevel: ImpactLevel | null;
  slaDeadline: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  _hash: string; // internal — for idempotency, not exposed
}

export interface TicketPublic extends Omit<Ticket, '_hash'> {}

// ─── API Response Envelope ────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
    timestamp: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface CreateTicketDTO {
  customerId: string;
  title: string;
  description: string;
  category: TicketCategory;
  reporterEmail: string;
  priority?: TicketPriority;
  affectedUsers?: number;
  impactLevel?: ImpactLevel;
  tags?: string[];
}

export interface EscalateTicketDTO {
  justification: string;
  requestedBy: string;
  newPriority?: TicketPriority;
}

export interface TriageDTO {
  customerId: string;
  category: TicketCategory;
  impactLevel: ImpactLevel;
  affectedUsers: number;
  description: string;
}

export interface TriageResult {
  suggestedPriority: TicketPriority;
  priorityReason: string;
  slaResponseHours: number;
  recommendedActions: string[];
  summary: string;
}

// ─── Conversation ─────────────────────────────────────────────────────────────

export type ConversationEventResult = 'success' | 'error';

export interface ConversationEvent {
  id: string;
  conversationId: string;
  timestamp: string;
  intent: string;
  action: string;
  customerId: string | null;
  ticketId: string | null;
  result: ConversationEventResult;
  details: string | null;
}

export interface ConversationSummary {
  conversationId: string;
  startedAt: string;
  updatedAt: string;
  totalEvents: number;
  customersConsulted: string[];
  ticketsConsulted: string[];
  ticketsCreated: string[];
  ticketsEscalated: string[];
  triagePerformed: boolean;
  events: ConversationEvent[];
  summary: string;
}

export interface RegisterEventDTO {
  conversationId: string;
  intent: string;
  action: string;
  customerId?: string | null;
  ticketId?: string | null;
  result: ConversationEventResult;
  details?: string | null;
}

// ─── Simulation ───────────────────────────────────────────────────────────────

export type SimulateMode = 'timeout' | 'error' | 'latency';
