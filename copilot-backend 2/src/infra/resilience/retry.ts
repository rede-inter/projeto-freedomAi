/**
 * Standalone retry with exponential backoff.
 * Used by services that call external APIs directly (not via HttpClient).
 */

export interface RetryOptions {
  maxAttempts?: number;         // default 3
  backoffMs?:   number[];       // default [0, 500, 1000]
  isRetryable?: (err: unknown) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const backoffMs   = opts.backoffMs   ?? [0, 500, 1_000];
  const isRetryable = opts.isRetryable ?? (() => true);

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const delay = backoffMs[attempt] ?? backoffMs.at(-1) ?? 0;
    if (delay > 0) {
      await new Promise((r) => setTimeout(r, delay));
    }

    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryable(err)) break;
    }
  }

  throw lastError;
}
