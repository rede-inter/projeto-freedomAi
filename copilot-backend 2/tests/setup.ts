// This file runs before any test file is imported.
// Sets all required env vars so config/env.ts validates successfully.
process.env.NODE_ENV = 'test';
process.env.STUDIO_API_KEY = 'dev-secret-key-change-in-production';
process.env.LOG_LEVEL = 'silent';
process.env.USE_MOCK_APIS = 'true';
process.env.PORT = '3001';
process.env.API_TIMEOUT_MS = '5000';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX = '100';
