import type { FastifyPluginAsync } from 'fastify';
import { ProductService } from '../../services/productService.js';
import { AvailabilityService } from '../../services/availabilityService.js';
import { BookingService } from '../../services/bookingService.js';
import {
  addAvailabilityBodySchema,
  addAvailabilityParamsSchema,
  adminBookingsQuerySchema,
  createProductBodySchema
} from '../../schemas/admin.js';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  const productService = new ProductService(fastify.prisma);
  const availabilityService = new AvailabilityService(fastify.prisma);
  const bookingService = new BookingService(fastify.prisma);

  fastify.addHook('preHandler', fastify.verifyAdminToken);

  fastify.post(
    '/products',
    {
      schema: {
        tags: ['Admin'],
        security: [{ AdminToken: [] }],
        body: createProductBodySchema
      }
    },
    async (request, reply) => {
      const body = createProductBodySchema.parse(request.body);
      const created = await productService.createProduct(body);
      reply.code(201).send(created);
    }
  );

  fastify.post(
    '/products/:id/availability',
    {
      schema: {
        tags: ['Admin'],
        security: [{ AdminToken: [] }],
        params: addAvailabilityParamsSchema,
        body: addAvailabilityBodySchema
      }
    },
    async (request, reply) => {
      const params = addAvailabilityParamsSchema.parse(request.params);
      const body = addAvailabilityBodySchema.parse(request.body);

      const product = await fastify.prisma.product.findUnique({ where: { id: params.id } });
      if (!product) {
        reply.code(404).send({ error: 'Product not found' });
        return;
      }

      await availabilityService.upsertProductAvailabilities(params.id, body.availabilities);
      reply.send({ data: { updated: body.availabilities.length } });
    }
  );

  fastify.get(
    '/bookings',
    {
      schema: {
        tags: ['Admin'],
        security: [{ AdminToken: [] }],
        querystring: adminBookingsQuerySchema
      }
    },
    async (request) => {
      const query = adminBookingsQuerySchema.parse(request.query);
      const rows = await bookingService.listBookings({
        status: query.status,
        gygBookingReference: query.gygBookingReference
      });
      return { data: rows };
    }
  );
};

export default adminRoutes;
