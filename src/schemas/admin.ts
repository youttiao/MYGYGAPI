import { z } from 'zod';

export const createProductBodySchema = z.object({
  supplierId: z.string().min(1),
  productId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  timezone: z.string().min(1),
  currency: z.string().length(3),
  status: z.enum(['active', 'inactive']).default('active'),
  destinationCity: z.string().default('Berlin'),
  destinationCountry: z.string().length(3).default('DEU'),
  participantsMin: z.number().int().positive().optional(),
  participantsMax: z.number().int().positive().optional(),
  autoCloseHours: z.number().int().nonnegative().optional(),
  pricingCategories: z
    .array(
      z.object({
        category: z.string(),
        minTicketAmount: z.number().int().nullable().optional(),
        maxTicketAmount: z.number().int().nullable().optional(),
        groupSizeMin: z.number().int().nullable().optional(),
        groupSizeMax: z.number().int().nullable().optional(),
        ageFrom: z.number().int().nullable().optional(),
        ageTo: z.number().int().nullable().optional(),
        bookingCategory: z.string().nullable().optional(),
        price: z
          .array(z.object({ priceType: z.string(), price: z.number().int(), currency: z.string() }))
          .nullable()
          .optional()
      })
    )
    .optional(),
  addons: z
    .array(
      z.object({
        addonType: z.enum(['FOOD', 'DRINKS', 'SAFETY', 'TRANSPORT', 'DONATION', 'OTHERS']),
        addonDescription: z.string().max(50).optional(),
        retailPrice: z.number().int().nonnegative(),
        currency: z.string().length(3)
      })
    )
    .optional()
});

export const addAvailabilityParamsSchema = z.object({
  id: z.string().min(1)
});

export const addAvailabilityBodySchema = z.object({
  availabilities: z
    .array(
      z.object({
        dateTime: z.string().datetime({ offset: true }),
        openingTimes: z
          .array(
            z.object({
              fromTime: z.string(),
              toTime: z.string()
            })
          )
          .optional(),
        cutoffSeconds: z.number().int().nonnegative().optional(),
        vacancies: z.number().int().nonnegative().optional(),
        vacanciesByCategory: z
          .array(
            z.object({
              category: z.string(),
              vacancies: z.number().int().nonnegative()
            })
          )
          .optional(),
        currency: z.string().length(3).optional(),
        pricesByCategory: z
          .object({
            retailPrices: z.array(
              z.object({
                category: z.string(),
                price: z.number().int().nonnegative()
              })
            )
          })
          .optional(),
        tieredPricesByCategory: z
          .object({
            retailPrices: z.array(
              z.object({
                category: z.string(),
                tiers: z.array(
                  z.object({
                    lowerBound: z.number().int().positive(),
                    upperBound: z.number().int().positive().nullable().optional(),
                    price: z.number().int().nonnegative()
                  })
                )
              })
            )
          })
          .optional()
      })
    )
    .min(1)
});

export const adminBookingsQuerySchema = z.object({
  status: z.enum(['created', 'confirmed', 'cancelled', 'failed']).optional(),
  gygBookingReference: z.string().optional()
});

export const adminProductsQuerySchema = z.object({
  supplierId: z.string().optional()
});

export const adminProductParamsSchema = z.object({
  id: z.string().min(1)
});

export const adminAvailabilityQuerySchema = z.object({
  fromDateTime: z.string().datetime({ offset: true }).optional(),
  toDateTime: z.string().datetime({ offset: true }).optional()
});

export const adminPushNotifyAvailabilityBodySchema = z.object({
  fromDateTime: z.string().datetime({ offset: true }),
  toDateTime: z.string().datetime({ offset: true })
});

export const adminAvailabilityDeleteParamsSchema = z.object({
  id: z.string().min(1),
  availabilityId: z.string().min(1)
});

export const adminProductSettingsBodySchema = z
  .object({
    autoCloseHours: z.number().int().nonnegative().optional(),
    participantsMin: z.number().int().positive().optional(),
    participantsMax: z.number().int().positive().optional(),
    groupSizeMin: z.number().int().positive().optional(),
    groupSizeMax: z.number().int().positive().optional()
  })
  .refine(
    (value) =>
      value.autoCloseHours !== undefined ||
      value.participantsMin !== undefined ||
      value.participantsMax !== undefined ||
      value.groupSizeMin !== undefined ||
      value.groupSizeMax !== undefined,
    { message: 'At least one settings field must be provided' }
  );

export const adminProductAddonsBodySchema = z.object({
  addons: z.array(
    z.object({
      addonType: z.enum(['FOOD', 'DRINKS', 'SAFETY', 'TRANSPORT', 'DONATION', 'OTHERS']),
      retailPrice: z.number().int().nonnegative(),
      currency: z.string().length(3),
      addonDescription: z.string().max(50).optional()
    })
  )
});

export const adminAccessLogsQuerySchema = z.object({
  source: z.string().optional(),
  path: z.string().optional(),
  statusCode: z.coerce.number().int().min(100).max(599).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100)
});
