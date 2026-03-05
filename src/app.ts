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
    ignoreTrailingSlash: true,
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
    request.auditStartedAt = Date.now();
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

  app.addHook('onSend', async (request, _reply, payload) => {
    if (!request.url.startsWith('/1/')) {
      return payload;
    }

    try {
      if (typeof payload === 'string') {
        request.auditResponseBody = JSON.parse(payload);
      } else {
        request.auditResponseBody = payload as unknown;
      }
    } catch {
      request.auditResponseBody = {
        raw: typeof payload === 'string' ? payload.slice(0, 2000) : String(payload)
      };
    }
    return payload;
  });

  app.addHook('onResponse', async (request, reply) => {
    if (!request.url.startsWith('/1/')) {
      return;
    }

    const startedAt = request.auditStartedAt ?? Date.now();
    const durationMs = Date.now() - startedAt;
    const ip =
      request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
      request.ip ??
      undefined;
    const userAgent = request.headers['user-agent']?.toString();

    const sanitizeBody = (value: unknown): unknown => {
      if (value === null || value === undefined) {
        return undefined;
      }
      if (typeof value === 'string') {
        return value.length > 2000 ? `${value.slice(0, 2000)}...[truncated]` : value;
      }
      return value;
    };

    try {
      await app.prisma.httpAccessLog.create({
        data: {
          direction: 'INBOUND',
          source: 'GYG',
          method: request.method,
          path: request.url.split('?')[0],
          statusCode: reply.statusCode,
          requestId: request.requestIdValue,
          correlationId: request.correlationId,
          ip,
          userAgent,
          durationMs,
          requestBody: sanitizeBody(
            request.method === 'GET' ? (request.query as unknown) : (request.body as unknown)
          ) as any,
          responseBody: sanitizeBody(request.auditResponseBody) as any
        }
      });
    } catch (error) {
      request.log.error({ err: error }, 'http_access_log_write_failed');
    }
  });

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
