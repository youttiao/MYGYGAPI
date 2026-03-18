import type { FastifyPluginAsync } from 'fastify';
import { ProductService } from '../../services/productService.js';
import { AvailabilityService } from '../../services/availabilityService.js';
import { BookingService } from '../../services/bookingService.js';
import { GygOutboundService } from '../../services/gygOutboundService.js';
import {
  addAvailabilityBodySchema,
  addAvailabilityParamsSchema,
  adminAvailabilityQuerySchema,
  adminBookingsQuerySchema,
  adminAvailabilityDeleteParamsSchema,
  adminAccessLogsQuerySchema,
  adminProductSettingsBodySchema,
  adminProductParamsSchema,
  adminProductAddonsBodySchema,
  adminProductsQuerySchema,
  adminPushNotifyAvailabilityBodySchema,
  createProductBodySchema
} from '../../schemas/admin.js';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  const productService = new ProductService(fastify.prisma);
  const availabilityService = new AvailabilityService(fastify.prisma);
  const bookingService = new BookingService(fastify.prisma);
  const gygOutboundService = new GygOutboundService();

  // Legacy path kept for compatibility.
  fastify.get('/ui', async (_request, reply) => {
    reply.redirect('/');
  });

  fastify.addHook('preHandler', fastify.verifyAdminToken);

  fastify.get(
    '/products',
    {
      schema: {
        tags: ['Admin'],
        security: [{ AdminToken: [] }],
        querystring: adminProductsQuerySchema
      }
    },
    async (request) => {
      const query = adminProductsQuerySchema.parse(request.query);
      const products = await productService.listProducts({ supplierId: query.supplierId });
      return { data: products };
    }
  );

  fastify.get(
    '/products/:id',
    {
      schema: {
        tags: ['Admin'],
        security: [{ AdminToken: [] }],
        params: adminProductParamsSchema
      }
    },
    async (request, reply) => {
      const params = adminProductParamsSchema.parse(request.params);
      const product = await productService.getProductById(params.id);
      if (!product) {
        reply.code(404).send({ error: 'Product not found' });
        return;
      }
      return { data: product };
    }
  );

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

  fastify.patch(
    '/products/:id/addons',
    {
      schema: {
        tags: ['Admin'],
        security: [{ AdminToken: [] }],
        params: adminProductParamsSchema,
        body: adminProductAddonsBodySchema
      }
    },
    async (request, reply) => {
      const params = adminProductParamsSchema.parse(request.params);
      const body = adminProductAddonsBodySchema.parse(request.body);
      const product = await productService.getProductById(params.id);
      if (!product) {
        reply.code(404).send({ error: 'Product not found' });
        return;
      }
      const updated = await productService.replaceProductAddons(params.id, body.addons);
      return { data: updated };
    }
  );

  fastify.patch(
    '/products/:id/settings',
    {
      schema: {
        tags: ['Admin'],
        security: [{ AdminToken: [] }],
        params: adminProductParamsSchema,
        body: adminProductSettingsBodySchema
      }
    },
    async (request, reply) => {
      const params = adminProductParamsSchema.parse(request.params);
      const body = adminProductSettingsBodySchema.parse(request.body);
      const product = await productService.getProductById(params.id);
      if (!product) {
        reply.code(404).send({ error: 'Product not found' });
        return;
      }
      const updated = await productService.updateProductSettings(params.id, {
        autoCloseHours: body.autoCloseHours,
        participantsMin: body.participantsMin,
        participantsMax: body.participantsMax,
        groupSizeMin: body.groupSizeMin,
        groupSizeMax: body.groupSizeMax,
        pricingMode: body.pricingMode
      });
      return { data: updated };
    }
  );

  fastify.get(
    '/products/:id/availability',
    {
      schema: {
        tags: ['Admin'],
        security: [{ AdminToken: [] }],
        params: addAvailabilityParamsSchema,
        querystring: adminAvailabilityQuerySchema
      }
    },
    async (request, reply) => {
      const params = addAvailabilityParamsSchema.parse(request.params);
      const query = adminAvailabilityQuerySchema.parse(request.query);
      const product = await productService.getProductById(params.id);
      if (!product) {
        reply.code(404).send({ error: 'Product not found' });
        return;
      }

      const now = new Date();
      const from = query.fromDateTime ?? new Date(now.getTime() - 7 * 86400000).toISOString();
      const to = query.toDateTime ?? new Date(now.getTime() + 60 * 86400000).toISOString();
      const rows = await availabilityService.getAvailabilitiesByInternalProduct(params.id, from, to);
      return { data: rows };
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

  fastify.delete(
    '/products/:id/availability/:availabilityId',
    {
      schema: {
        tags: ['Admin'],
        security: [{ AdminToken: [] }],
        params: adminAvailabilityDeleteParamsSchema
      }
    },
    async (request, reply) => {
      const params = adminAvailabilityDeleteParamsSchema.parse(request.params);
      const product = await productService.getProductById(params.id);
      if (!product) {
        reply.code(404).send({ error: 'Product not found' });
        return;
      }
      const result = await availabilityService.deleteAvailability(params.id, params.availabilityId);
      return { data: { deleted: result.count } };
    }
  );

  fastify.post(
    '/products/:id/push-notify-availability-update',
    {
      schema: {
        tags: ['Admin'],
        security: [{ AdminToken: [] }],
        params: addAvailabilityParamsSchema,
        body: adminPushNotifyAvailabilityBodySchema
      }
    },
    async (request, reply) => {
      const params = addAvailabilityParamsSchema.parse(request.params);
      const body = adminPushNotifyAvailabilityBodySchema.parse(request.body);

      const product = await productService.getProductById(params.id);
      if (!product) {
        reply.code(404).send({ error: 'Product not found' });
        return;
      }

      const rows = await availabilityService.getAvailabilitiesByInternalProduct(
        params.id,
        body.fromDateTime,
        body.toDateTime
      );

      const mapped = rows.map((row) => ({
        dateTime: row.dateTime.toISOString(),
        openingTimes: row.openingTimes,
        vacancies: row.vacancies,
        vacanciesByCategory: row.vacanciesByCategory,
        cutoffSeconds: row.cutoffSeconds,
        currency: row.currency,
        pricesByCategory: row.pricesByCategory,
        tieredPricesByCategory: row.tieredPricesByCategory
      }));

      if (mapped.length === 0) {
        reply.code(400).send({
          error: 'No availabilities found in selected range'
        });
        return;
      }

      let result: Awaited<ReturnType<typeof gygOutboundService.notifyAvailabilityUpdate>>;
      try {
        result = await gygOutboundService.notifyAvailabilityUpdate({
          productId: product.productId,
          availabilities: mapped
        });

        await fastify.prisma.httpAccessLog.create({
          data: {
            direction: 'OUTBOUND',
            source: 'GYG_NOTIFY',
            method: 'POST',
            path: '/1/notify-availability-update',
            statusCode: result.status,
            requestBody: {
              productId: product.productId,
              availabilities: mapped
            } as any,
            responseBody: result.body as any
          }
        });
      } catch (error) {
        await fastify.prisma.httpAccessLog.create({
          data: {
            direction: 'OUTBOUND',
            source: 'GYG_NOTIFY',
            method: 'POST',
            path: '/1/notify-availability-update',
            statusCode: 0,
            requestBody: {
              productId: product.productId,
              availabilities: mapped
            } as any,
            errorMessage: error instanceof Error ? error.message : String(error)
          }
        });
        throw error;
      }

      return {
        data: {
          request: {
            productId: product.productId,
            pushedAvailabilities: mapped.length,
            fromDateTime: body.fromDateTime,
            toDateTime: body.toDateTime
          },
          gygResponse: result
        }
      };
    }
  );

  fastify.get(
    '/access-logs',
    {
      schema: {
        tags: ['Admin'],
        security: [{ AdminToken: [] }],
        querystring: adminAccessLogsQuerySchema
      }
    },
    async (request) => {
      const query = adminAccessLogsQuerySchema.parse(request.query);
      const logs = await fastify.prisma.httpAccessLog.findMany({
        where: {
          source: query.source,
          path: query.path,
          statusCode: query.statusCode
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit
      });
      return { data: logs };
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
