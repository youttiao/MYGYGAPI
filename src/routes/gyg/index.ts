import type { FastifyPluginAsync } from 'fastify';
import { AvailabilityService } from '../../services/availabilityService.js';
import { BookingService } from '../../services/bookingService.js';
import { ProductService } from '../../services/productService.js';
import { toGygDateTime } from '../../lib/dateTime.js';
import {
  bookRequestSchema,
  cancelBookingRequestSchema,
  cancelReservationRequestSchema,
  getAvailabilitiesQuerySchema,
  notifyRequestSchema,
  productParamsSchema,
  reserveRequestSchema,
  supplierProductsParamsSchema
} from '../../schemas/gyg.js';

const gygRoutes: FastifyPluginAsync = async (fastify) => {
  const availabilityService = new AvailabilityService(fastify.prisma);
  const bookingService = new BookingService(fastify.prisma);
  const productService = new ProductService(fastify.prisma);

  fastify.addHook('preHandler', fastify.verifyGygBasicAuth);

  fastify.get(
    '/1/get-availabilities/',
    {
      schema: {
        tags: ['GYG Availability'],
        security: [{ BasicAuth: [] }],
        querystring: getAvailabilitiesQuerySchema
      }
    },
    async (request) => {
      const query = getAvailabilitiesQuerySchema.parse(request.query);
      const availabilities = await availabilityService.getAvailabilities(
        query.productId,
        query.fromDateTime,
        query.toDateTime
      );

      if (availabilities.length === 0) {
        const product = await productService.getProductByExternalId(query.productId);
        if (!product) {
          return { errorCode: 'INVALID_PRODUCT', errorMessage: 'Invalid productId' };
        }
      }

      return {
        data: {
          availabilities: availabilities.map((item: any) => {
            const rawPrices = item.pricesByCategory?.retailPrices;
            const normalizedPrices = Array.isArray(rawPrices)
              ? rawPrices.filter(
                  (row: any) =>
                    row &&
                    typeof row.category === 'string' &&
                    typeof row.price === 'number' &&
                    row.price >= 0
                )
              : [];
            const hasGroupCategory = normalizedPrices.some((row: any) => row.category === 'GROUP');
            const prices = hasGroupCategory
              ? normalizedPrices.filter((row: any) => row.category === 'GROUP')
              : normalizedPrices;
            const pricesByCategory =
              prices.length > 0
                ? {
                    retailPrices: prices
                  }
                : undefined;
            const openingTimes = Array.isArray(item.openingTimes) ? item.openingTimes : undefined;
            const isTimePeriod = Array.isArray(openingTimes) && openingTimes.length > 0;

            const finalVacanciesByCategory = hasGroupCategory
              ? null
              : item.vacanciesByCategory ?? null;
            const includeVacancies = hasGroupCategory || !finalVacanciesByCategory;

            return {
              productId: item.product.productId,
              dateTime: toGygDateTime(item.dateTime, item.product?.timezone),
              openingTimes,
              cutoffSeconds: item.cutoffSeconds,
              vacancies: includeVacancies ? item.vacancies : undefined,
              vacanciesByCategory: finalVacanciesByCategory,
              currency: item.currency,
              pricesByCategory,
              tieredPricesByCategory: item.tieredPricesByCategory
            };
          })
        }
      };
    }
  );

  fastify.post(
    '/1/reserve/',
    {
      schema: {
        tags: ['GYG Reservations'],
        security: [{ BasicAuth: [] }],
        body: reserveRequestSchema
      }
    },
    async (request) => {
      const body = reserveRequestSchema.parse(request.body);
      return bookingService.reserve({
        ...body.data,
        rawPayload: body
      });
    }
  );

  fastify.post(
    '/1/cancel-reservation/',
    {
      schema: {
        tags: ['GYG Reservations'],
        security: [{ BasicAuth: [] }],
        body: cancelReservationRequestSchema
      }
    },
    async (request) => {
      const body = cancelReservationRequestSchema.parse(request.body);
      return bookingService.cancelReservation({ reservationReference: body.data.reservationReference });
    }
  );

  fastify.post(
    '/1/book/',
    {
      schema: {
        tags: ['GYG Bookings'],
        security: [{ BasicAuth: [] }],
        body: bookRequestSchema
      }
    },
    async (request) => {
      const body = bookRequestSchema.parse(request.body);
      return bookingService.book({ ...body.data, rawPayload: body });
    }
  );

  fastify.post(
    '/1/cancel-booking/',
    {
      schema: {
        tags: ['GYG Bookings'],
        security: [{ BasicAuth: [] }],
        body: cancelBookingRequestSchema
      }
    },
    async (request) => {
      const body = cancelBookingRequestSchema.parse(request.body);
      return bookingService.cancelBooking({
        bookingReference: body.data.bookingReference,
        gygBookingReference: body.data.gygBookingReference,
        productId: body.data.productId
      });
    }
  );

  fastify.post(
    '/1/notify/',
    {
      schema: {
        tags: ['GYG Notifications'],
        security: [{ BasicAuth: [] }],
        body: notifyRequestSchema
      }
    },
    async (request) => {
      const body = notifyRequestSchema.parse(request.body);
      await bookingService.saveNotification(body);
      return { data: {} };
    }
  );

  fastify.get(
    '/1/products/:productId/pricing-categories/',
    {
      schema: {
        tags: ['GYG Products'],
        security: [{ BasicAuth: [] }],
        params: productParamsSchema
      }
    },
    async (request) => {
      const { productId } = productParamsSchema.parse(request.params);
      const product = await productService.getProductByExternalId(productId);
      if (!product) {
        return { errorCode: 'INVALID_PRODUCT', errorMessage: 'This product does not exist' };
      }
      return {
        data: {
          pricingCategories: product.pricingCategories.map((row: any) => ({
            category: row.category,
            minTicketAmount: row.minTicketAmount,
            maxTicketAmount: row.maxTicketAmount,
            groupSizeMin: row.groupSizeMin,
            groupSizeMax: row.groupSizeMax,
            ageFrom: row.ageFrom,
            ageTo: row.ageTo,
            bookingCategory: row.bookingCategory,
            price: row.price
          }))
        }
      };
    }
  );

  fastify.get(
    '/1/suppliers/:supplierId/products/',
    {
      schema: {
        tags: ['GYG Products'],
        security: [{ BasicAuth: [] }],
        params: supplierProductsParamsSchema
      }
    },
    async (request) => {
      const { supplierId } = supplierProductsParamsSchema.parse(request.params);
      const products = await productService.listSupplierProducts(supplierId);
      if (products.length === 0) {
        return { errorCode: 'INVALID_SUPPLIER', errorMessage: 'Supplier ID not found' };
      }

      return {
        data: {
          supplierId,
          supplierName: 'OPS Minimal Supplier',
          products: products.map((item: any) => ({
            productId: item.productId,
            productTitle: item.name
          }))
        }
      };
    }
  );

  fastify.get(
    '/1/products/:productId/addons/',
    {
      schema: {
        tags: ['GYG Addons'],
        security: [{ BasicAuth: [] }],
        params: productParamsSchema
      }
    },
    async (request) => {
      const { productId } = productParamsSchema.parse(request.params);
      const product = await productService.getProductByExternalId(productId);
      if (!product) {
        return { errorCode: 'INVALID_PRODUCT', errorMessage: 'This product does not exist' };
      }

      return {
        data: {
          addons: product.addons.map((addon: any) => ({
            addonType: addon.addonType,
            addonDescription: addon.addonDescription,
            retailPrice: addon.retailPrice,
            currency: addon.currency
          }))
        }
      };
    }
  );

  fastify.get(
    '/1/products/:productId',
    {
      schema: {
        tags: ['GYG Products'],
        security: [{ BasicAuth: [] }],
        params: productParamsSchema
      }
    },
    async (request) => {
      const { productId } = productParamsSchema.parse(request.params);
      const product = await productService.getProductByExternalId(productId);
      if (!product) {
        return { errorCode: 'INVALID_PRODUCT', errorMessage: 'This product does not exist' };
      }

      return {
        data: {
          supplierId: product.supplierId,
          productTitle: product.name,
          productDescription: product.description,
          destinationLocation: {
            city: product.destinationCity,
            country: product.destinationCountry
          },
          configuration: {
            participantsConfiguration: {
              min: product.participantsMin,
              max: product.participantsMax
            }
          }
        }
      };
    }
  );
};

export default gygRoutes;
