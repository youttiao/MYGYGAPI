import { buildApp } from './app.js';
import { env } from './config/env.js';

const app = await buildApp();

try {
  await app.listen({ port: env.port, host: env.host });
  app.log.info({ port: env.port, host: env.host }, 'server_started');
} catch (error) {
  app.log.error(error, 'server_start_failed');
  process.exit(1);
}
