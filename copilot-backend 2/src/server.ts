import { buildApp } from './app.js';
import { env } from './config/env.js';

const app = buildApp();

app.listen({ port: env.PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(
    {
      address,
      port: env.PORT,
      env: env.NODE_ENV,
      mockMode: env.USE_MOCK_APIS,
    },
    `🚀 Copiloto Backend iniciado em ${address}`,
  );
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'Recebido sinal de shutdown');
  await app.close();
  app.log.info('Servidor encerrado com sucesso');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
