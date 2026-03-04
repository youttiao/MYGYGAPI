import type { PrismaClient } from '@prisma/client';
import type { FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    requestIdValue?: string;
    correlationId?: string;
  }

  interface FastifyInstance {
    prisma: PrismaClient;
    verifyGygBasicAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    verifyAdminToken: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
