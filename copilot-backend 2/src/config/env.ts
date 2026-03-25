import { z } from 'zod';

// Load .env manually (no dotenv package needed — tsx loads it via process.env)
// For production, use a proper secret manager.

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),

  STUDIO_API_KEY: z.string().min(8, 'STUDIO_API_KEY must be at least 8 characters'),

  USE_MOCK_APIS: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),

  TICKETS_API_URL: z.string().url().optional(),
  TICKETS_API_KEY: z.string().optional(),
  CUSTOMERS_API_URL: z.string().url().optional(),
  CUSTOMERS_API_KEY: z.string().optional(),

  API_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(5000),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().default(100),
});

function loadEnv() {
  // Load .env file only outside test mode (tests inject vars via setup.ts)
  if (process.env.NODE_ENV !== 'test') {
    try {
      const fs = require('fs');
      const path = require('path');
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIndex = trimmed.indexOf('=');
          if (eqIndex === -1) continue;
          const key = trimmed.slice(0, eqIndex).trim();
          const value = trimmed.slice(eqIndex + 1).trim();
          if (!(key in process.env)) {
            process.env[key] = value;
          }
        }
      }
    } catch {
      // ignore — env vars may already be set
    }
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`❌ Invalid environment variables:\n${issues}`);
  }

  return result.data;
}

export const env = loadEnv();
