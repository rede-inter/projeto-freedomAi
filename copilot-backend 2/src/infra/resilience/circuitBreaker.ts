/**
 * Real Circuit Breaker — closed / open / half-open
 *
 * - closed:    requests pass through normally
 * - open:      requests are rejected immediately (no network call)
 * - half-open: one probe request allowed; success → closed, failure → open
 *
 * This lives in the BACKEND (not in Dify).
 * Dify receives 503 + circuit error code and shows fallback message.
 */

export type CircuitStatus = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number;   // failures before opening  (default: 5)
  cooldownMs?: number;         // time open before half-open (default: 60_000)
  halfOpenSuccesses?: number;  // successes in half-open to close (default: 2)
}

interface CircuitState {
  status: CircuitStatus;
  failures: number;
  successes: number;          // consecutive successes in half-open
  lastFailureAt: number | null;
  lastAttemptAt: number | null;
}

export class CircuitBreaker {
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly halfOpenSuccesses: number;
  private state: CircuitState;

  constructor(opts: CircuitBreakerOptions) {
    this.name              = opts.name;
    this.failureThreshold  = opts.failureThreshold ?? 5;
    this.cooldownMs        = opts.cooldownMs ?? 60_000;
    this.halfOpenSuccesses = opts.halfOpenSuccesses ?? 2;
    this.state = {
      status:        'closed',
      failures:      0,
      successes:     0,
      lastFailureAt: null,
      lastAttemptAt: null,
    };
  }

  /** Returns current status (may transition open→half-open based on time) */
  getStatus(): CircuitStatus {
    this.maybeTransitionToHalfOpen();
    return this.state.status;
  }

  /** Call this before making a request. Returns false if circuit is open. */
  canRequest(): boolean {
    this.maybeTransitionToHalfOpen();
    return this.state.status !== 'open';
  }

  /** Call after a successful request */
  onSuccess(): void {
    this.state.lastAttemptAt = Date.now();

    if (this.state.status === 'half-open') {
      this.state.successes++;
      if (this.state.successes >= this.halfOpenSuccesses) {
        this.transitionTo('closed');
      }
    } else if (this.state.status === 'closed') {
      // Reset failure count on success
      this.state.failures = 0;
    }
  }

  /** Call after a failed request (only for transient failures — not 4xx) */
  onFailure(): void {
    this.state.failures++;
    this.state.lastFailureAt  = Date.now();
    this.state.lastAttemptAt  = Date.now();

    if (
      this.state.status === 'closed' &&
      this.state.failures >= this.failureThreshold
    ) {
      this.transitionTo('open');
    } else if (this.state.status === 'half-open') {
      // Single failure in half-open → back to open
      this.transitionTo('open');
    }
  }

  /** Serializable snapshot for health endpoint */
  getSnapshot(): Record<string, unknown> {
    return {
      name:          this.name,
      status:        this.state.status,
      failures:      this.state.failures,
      lastFailureAt: this.state.lastFailureAt,
      cooldownMs:    this.cooldownMs,
    };
  }

  private maybeTransitionToHalfOpen(): void {
    if (
      this.state.status === 'open' &&
      this.state.lastFailureAt !== null &&
      Date.now() - this.state.lastFailureAt >= this.cooldownMs
    ) {
      this.transitionTo('half-open');
    }
  }

  private transitionTo(next: CircuitStatus): void {
    const prev = this.state.status;
    this.state.status   = next;
    this.state.successes = 0;
    if (next === 'closed') {
      this.state.failures      = 0;
      this.state.lastFailureAt = null;
    }
    // Log transition (uses console so it works without injecting logger)
    if (prev !== next) {
      console.log(JSON.stringify({
        level:     'warn',
        event:     'circuit_breaker.transition',
        circuit:   this.name,
        from:      prev,
        to:        next,
        failures:  this.state.failures,
        timestamp: new Date().toISOString(),
      }));
    }
  }
}

// ─── Singleton registry ────────────────────────────────────────────────────
const registry = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(name: string, opts?: Partial<CircuitBreakerOptions>): CircuitBreaker {
  if (!registry.has(name)) {
    registry.set(name, new CircuitBreaker({ name, ...opts }));
  }
  return registry.get(name)!;
}

/** For health endpoint */
export function getAllCircuitSnapshots(): Record<string, unknown>[] {
  return Array.from(registry.values()).map((cb) => cb.getSnapshot());
}
