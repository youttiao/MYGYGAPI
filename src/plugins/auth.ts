import fp from 'fastify-plugin';
import basicAuth from '@fastify/basic-auth';
import rateLimit from '@fastify/rate-limit';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';

function unauthorized(reply: FastifyReply): void {
  reply.code(401).send({
    errorCode: 'AUTHORIZATION_FAILURE',
    errorMessage: 'Invalid credentials'
  });
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(rateLimit, {
    max: env.rateLimitMax,
    timeWindow: env.rateLimitTimeWindow
  });

  await fastify.register(basicAuth, {
    validate: async (username, password, _request, reply) => {
      if (username !== env.basicAuthUser || password !== env.basicAuthPass) {
        unauthorized(reply);
        return;
      }
    },
    authenticate: true
  });

  fastify.decorate('verifyGygBasicAuth', async function verifyGygBasicAuth(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    await (request as any).rateLimit();
    await (fastify as any).basicAuth(request, reply);
  });

  fastify.decorate('verifyAdminToken', async function verifyAdminToken(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const token = request.headers['x-admin-token'];
    if (token !== env.adminToken) {
      return reply.code(401).send({ error: 'Unauthorized admin token' });
    }
  });
};

export default fp(authPlugin);
