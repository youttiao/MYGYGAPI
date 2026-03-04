import { z } from 'zod';

export const categoryEnum = z.enum([
  'ADULT',
  'CHILD',
  'YOUTH',
  'INFANT',
  'SENIOR',
  'STUDENT',
  'EU_CITIZEN',
  'MILITARY',
  'EU_CITIZEN_STUDENT',
  'GROUP'
]);

export const ticketCodeTypeEnum = z.enum([
  'TEXT',
  'BARCODE_CODE39',
  'BARCODE_CODE128',
  'QR_CODE',
  'DATA_MATRIX',
  'EAN_13',
  'ITF',
  'AZTEC'
]);

export const getAvailabilitiesQuerySchema = z.object({
  productId: z.string().min(1),
  fromDateTime: z.string().datetime({ offset: true }),
  toDateTime: z.string().datetime({ offset: true })
});

export const reserveRequestSchema = z.object({
  data: z.object({
    productId: z.string().min(1),
    dateTime: z.string().datetime({ offset: true }),
    bookingItems: z
      .array(
        z.object({
          category: categoryEnum,
          count: z.number().int().positive(),
          groupSize: z.number().int().positive().optional()
        })
      )
      .min(1),
    gygBookingReference: z.string().min(1),
    gygActivityReference: z.string().optional()
  })
});

export const cancelReservationRequestSchema = z.object({
  data: z.object({
    gygBookingReference: z.string().min(1),
    reservationReference: z.string().min(1),
    gygActivityReference: z.string().optional()
  })
});

export const travelerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phoneNumber: z.string().min(1)
});

export const bookingItemSchema = z.object({
  category: categoryEnum,
  count: z.number().int().positive(),
  groupSize: z.number().int().positive().optional(),
  retailPrice: z.number().int().nonnegative()
});

export const addonItemSchema = z.object({
  addonType: z.enum(['FOOD', 'DRINKS', 'SAFETY', 'TRANSPORT', 'DONATION', 'OTHERS']),
  addonDescription: z.string().max(50).optional(),
  count: z.number().int().positive(),
  retailPrice: z.number().int().nonnegative()
});

export const bookRequestSchema = z.object({
  data: z.object({
    productId: z.string().min(1),
    reservationReference: z.string().min(1),
    gygBookingReference: z.string().min(1),
    gygActivityReference: z.string().optional(),
    currency: z.string().length(3),
    dateTime: z.string().datetime({ offset: true }),
    bookingItems: z.array(bookingItemSchema).min(1),
    addonItems: z.array(addonItemSchema).optional(),
    language: z.string().optional(),
    travelers: z.array(travelerSchema).min(1),
    travelerHotel: z.string().optional(),
    comment: z.string()
  })
});

export const cancelBookingRequestSchema = z.object({
  data: z.object({
    bookingReference: z.string().min(1),
    gygBookingReference: z.string().min(1),
    productId: z.string().min(1)
  })
});

export const notifyRequestSchema = z.object({
  data: z.object({
    notificationType: z.enum(['PRODUCT_DEACTIVATION']),
    description: z.string().min(1),
    supplierName: z.string().min(1),
    integrationName: z.string().min(1),
    dateTime: z.string().datetime({ offset: true }),
    productDetails: z.object({
      productId: z.string().min(1),
      gygTourOptionId: z.string().min(1),
      tourOptionTitle: z.string().min(1)
    }),
    notificationDetails: z.record(z.any())
  })
});

export const supplierProductsParamsSchema = z.object({
  supplierId: z.string().min(1)
});

export const productParamsSchema = z.object({
  productId: z.string().min(1)
});
