/**
 * Resilient HTTP Client
 * - AbortController timeout (real timeout, not Fastify's)
 * - Exponential backoff retry (only on transient errors)
 * - Circuit breaker integration
 * - Structured error output
 * - Correlation ID forwarding
 */

import { getCircuitBreaker, CircuitBreaker } from '../resilience/circuitBreaker.js';

export interface HttpClientConfig {
  baseUrl:          string;
  apiKey:           string;
  timeoutMs?:       number;    // per-attempt timeout, default 6000
  maxRetries?:      number;    // default 2 (3 total attempts)
  backoffMs?:       number[];  // default [0, 500, 1000]
  circuitName?:     string;    // if set, wraps calls with circuit breaker
}

export interface HttpResponse<T = unknown> {
  ok:      boolean;
  status:  number;
  data:    T | null;
  raw:     string;
  error?:  { code: string; message: string; details?: unknown };
  attempts: number;
}

// Status codes that should NOT be retried (client errors)
const NO_RETRY_CODES = new Set([400, 401, 403, 404, 409, 422, 429]);

export class HttpClient {
  private readonly config: Required<HttpClientConfig>;
  private readonly circuit: CircuitBreaker | null;

  constructor(cfg: HttpClientConfig) {
    this.config = {
      baseUrl:      cfg.baseUrl,
      apiKey:       cfg.apiKey,
      timeoutMs:    cfg.timeoutMs  ?? 6_000,
      maxRetries:   cfg.maxRetries ?? 2,
      backoffMs:    cfg.backoffMs  ?? [0, 500, 1_000],
      circuitName:  cfg.circuitName ?? '',
    };
    this.circuit = cfg.circuitName
      ? getCircuitBreaker(cfg.circuitName)
      : null;
  }

  async get<T = unknown>(
    path: string,
    opts?: { correlationId?: string },
  ): Promise<HttpResponse<T>> {
    return this.request<T>('GET', path, undefined, opts);
  }

  async post<T = unknown>(
    path: string,
    body: unknown,
    opts?: { correlationId?: string },
  ): Promise<HttpResponse<T>> {
    return this.request<T>('POST', path, body, opts);
  }

  private async request<T>(
    method: string,
    path: string,
    body: unknown,
    opts?: { correlationId?: string },
  ): Promise<HttpResponse<T>> {
    // Circuit breaker check
    if (this.circuit && !this.circuit.canRequest()) {
      const snap = this.circuit.getSnapshot();
      return {
        ok: false, status: 503, data: null, raw: '', attempts: 0,
        error: {
          code: 'CIRCUIT_OPEN',
          message: `Circuit breaker open for "${snap['name']}". Retry after cooldown.`,
        },
      };
    }

    const url = this.config.baseUrl + path;
    const headers: Record<string, string> = {
      'Content-Type':    'application/json',
      'X-API-Key':       this.config.apiKey,
    };
    if (opts?.correlationId) {
      headers['X-Conversation-Id'] = opts.correlationId;
    }

    const fetchOpts: RequestInit = { method, headers };
    if (body !== undefined) {
      fetchOpts.body = JSON.stringify(body);
    }

    let last: HttpResponse<T> | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      // Backoff before retrying
      const delay = this.config.backoffMs[attempt] ?? this.config.backoffMs.at(-1) ?? 0;
      if (delay > 0) {
        await new Promise((r) => setTimeout(r, delay));
      }

      const result = await this.tryOnce<T>(url, fetchOpts, this.config.timeoutMs);
      last = { ...result, attempts: attempt + 1 };

      if (result.ok) {
        this.circuit?.onSuccess();
        return last;
      }

      // Non-retryable client errors
      if (NO_RETRY_CODES.has(result.status)) {
        // Client errors don't count as circuit failures
        return last;
      }

      // Transient error — count as failure for circuit breaker
      this.circuit?.onFailure();
    }

    return last!;
  }

  private async tryOnce<T>(
    url: string,
    opts: RequestInit,
    timeoutMs: number,
  ): Promise<HttpResponse<T>> {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const res  = await fetch(url, { ...opts, signal: ctrl.signal });
      const raw  = await res.text();
      const ok   = res.status >= 200 && res.status < 300;

      let data: T | null = null;
      let error: HttpResponse<T>['error'];

      try {
        const parsed = JSON.parse(raw);
        if (ok) {
          data = (parsed as any)?.data ?? parsed;
        } else {
          error = {
            code:    (parsed as any)?.error?.code    ?? `HTTP_${res.status}`,
            message: (parsed as any)?.error?.message ?? `HTTP error ${res.status}`,
            details: (parsed as any)?.error?.details,
          };
        }
      } catch {
        error = { code: 'PARSE_ERROR', message: 'Response is not valid JSON' };
      }

      return { ok, status: res.status, data, raw, error, attempts: 1 };

    } catch (e: any) {
      const isTimeout = e?.name === 'AbortError';
      return {
        ok: false,
        status: isTimeout ? 504 : 503,
        data: null,
        raw: '',
        error: {
          code:    isTimeout ? 'UPSTREAM_TIMEOUT'     : 'UPSTREAM_UNAVAILABLE',
          message: isTimeout ? 'Request timed out'    : e?.message ?? 'Network error',
        },
        attempts: 1,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
