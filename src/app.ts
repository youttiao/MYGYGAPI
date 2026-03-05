import Fastify, { type FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from 'fastify-type-provider-zod';
import prismaPlugin from './plugins/prisma.js';
import openapiPlugin from './plugins/openapi.js';
import authPlugin from './plugins/auth.js';
import adminRoutes from './routes/admin/index.js';
import gygRoutes from './routes/gyg/index.js';
import uiRoutes from './routes/ui/index.js';
import { AutoCloseService } from './services/autoCloseService.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      redact: {
        paths: ['req.headers.authorization', 'headers.authorization', '*.password', '*.pass'],
        censor: '[REDACTED]'
      }
    }
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.addHook('onRequest', async (request) => {
    request.requestIdValue = request.headers['x-request-id']?.toString() ?? request.id;
    request.correlationId = request.headers['x-correlation-id']?.toString();
    request.log.info(
      {
        requestId: request.requestIdValue,
        correlationId: request.correlationId,
        method: request.method,
        url: request.url
      },
      'request_received'
    );
  });

  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(openapiPlugin);

  const autoCloseService = new AutoCloseService(app.prisma, app.log);
  autoCloseService.start();

  app.get('/health', async () => ({ ok: true }));
  app.get('/openapi.json', async () => app.swagger());

  await app.register(uiRoutes);
  await app.register(adminRoutes, { prefix: '/admin' });
  await app.register(gygRoutes);

  app.addHook('onClose', async () => {
    autoCloseService.stop();
  });

  app.setErrorHandler((error: unknown, _request, reply) => {
    if ((error as any).validation) {
      reply.code(200).send({
        errorCode: 'VALIDATION_FAILURE',
        errorMessage: (error as Error).message
      });
      return;
    }

    reply.code(500).send({
      errorCode: 'INTERNAL_SYSTEM_FAILURE',
      errorMessage: 'Internal server error'
    });
  });

  return app;
}
