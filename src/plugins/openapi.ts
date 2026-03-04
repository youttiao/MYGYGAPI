import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';
import type { FastifyPluginAsync } from 'fastify';

const openapiPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'OPS Minimal GYG Integrator API',
        version: '1.0.0'
      },
      components: {
        securitySchemes: {
          BasicAuth: {
            type: 'http',
            scheme: 'basic'
          },
          AdminToken: {
            type: 'apiKey',
            in: 'header',
            name: 'x-admin-token'
          }
        }
      }
    },
    transform: jsonSchemaTransform
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs'
  });
};

export default fp(openapiPlugin);
