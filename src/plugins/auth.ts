import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';

function unauthorized(reply: FastifyReply): void {
  reply.code(401).send({
    errorCode: 'AUTHORIZATION_FAILURE',
    errorMessage: 'Invalid credentials'
  });
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('verifyGygBasicAuth', async function verifyGygBasicAuth(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      unauthorized(reply);
      return;
    }

    let decoded = '';
    try {
      decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
    } catch {
      unauthorized(reply);
      return;
    }

    const splitIndex = decoded.indexOf(':');
    if (splitIndex < 0) {
      unauthorized(reply);
      return;
    }

    const username = decoded.slice(0, splitIndex);
    const password = decoded.slice(splitIndex + 1);
    if (username !== env.basicAuthUser || password !== env.basicAuthPass) {
      unauthorized(reply);
      return;
    }
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
