import type { PrismaClient } from '@prisma/client';
import { BookingRepository } from '../repositories/bookingRepository.js';
import { ProductRepository } from '../repositories/productRepository.js';

function makeReservationReference(gygBookingReference: string): string {
  return `res_${gygBookingReference}`.slice(0, 25);
}

function makeBookingReference(gygBookingReference: string): string {
  return `bk_${gygBookingReference}`.slice(0, 25);
}

export class BookingService {
  private readonly bookingRepo: BookingRepository;
  private readonly productRepo: ProductRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.bookingRepo = new BookingRepository(prisma);
    this.productRepo = new ProductRepository(prisma);
  }

  async reserve(input: {
    productId: string;
    dateTime: string;
    bookingItems: unknown;
    gygBookingReference: string;
    gygActivityReference?: string;
    rawPayload: unknown;
  }) {
    const existing = await this.bookingRepo.findReservationByGygBookingReference(input.gygBookingReference);
    if (existing) {
      return {
        data: {
          reservationReference: existing.reservationReference,
          reservationExpiration: existing.expiresAt?.toISOString()
        }
      };
    }

    const product = await this.productRepo.findByExternalProductId(input.productId);
    if (!product) {
      return { errorCode: 'INVALID_PRODUCT', errorMessage: 'Invalid productId' };
    }

    const reservationReference = makeReservationReference(input.gygBookingReference);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.bookingRepo.createReservation({
      reservationReference,
      gygBookingReference: input.gygBookingReference,
      gygActivityReference: input.gygActivityReference,
      productId: product.id,
      dateTime: new Date(input.dateTime),
      bookingItems: input.bookingItems,
      expiresAt,
      rawPayload: input.rawPayload
    });

    return {
      data: {
        reservationReference,
        reservationExpiration: expiresAt.toISOString()
      }
    };
  }

  async cancelReservation(input: { reservationReference: string }) {
    const existing = await this.bookingRepo.findReservationByReference(input.reservationReference);
    if (!existing) {
      return { errorCode: 'INVALID_RESERVATION', errorMessage: 'Reservation not found' };
    }

    if (existing.status === 'cancelled') {
      return { data: {} };
    }

    await this.bookingRepo.updateReservationStatus(input.reservationReference, 'cancelled');
    return { data: {} };
  }

  async book(input: {
    productId: string;
    reservationReference: string;
    gygBookingReference: string;
    gygActivityReference?: string;
    currency: string;
    dateTime: string;
    bookingItems: Array<{ category: string; count: number }>;
    addonItems?: unknown;
    language?: string;
    travelers: unknown;
    travelerHotel?: string;
    comment: string;
    rawPayload: unknown;
  }) {
    const existing = await this.bookingRepo.findBookingByGygBookingReference(input.gygBookingReference);
    if (existing) {
      return {
        data: {
          bookingReference: existing.bookingReference,
          tickets: existing.tickets
        }
      };
    }

    const product = await this.productRepo.findByExternalProductId(input.productId);
    if (!product) {
      return { errorCode: 'INVALID_PRODUCT', errorMessage: 'Invalid productId' };
    }

    const reservation = await this.bookingRepo.findReservationByReference(input.reservationReference);
    if (!reservation) {
      return { errorCode: 'INVALID_RESERVATION', errorMessage: 'Reservation not found' };
    }

    if (reservation.status !== 'created') {
      return { errorCode: 'INVALID_RESERVATION', errorMessage: 'Reservation not active' };
    }

    const bookingReference = makeBookingReference(input.gygBookingReference);
    const tickets = input.bookingItems.flatMap((item) =>
      Array.from({ length: item.count }).map((_, index) => ({
        category: item.category,
        ticketCode: `${bookingReference}_${item.category}_${index + 1}`,
        ticketCodeType: 'QR_CODE'
      }))
    );

    await this.prisma.$transaction(async () => {
      await this.bookingRepo.createBooking({
        bookingReference,
        gygBookingReference: input.gygBookingReference,
        gygActivityReference: input.gygActivityReference,
        reservationId: reservation.id,
        productId: product.id,
        dateTime: new Date(input.dateTime),
        currency: input.currency,
        bookingItems: input.bookingItems,
        addonItems: input.addonItems,
        language: input.language,
        travelers: input.travelers,
        travelerHotel: input.travelerHotel,
        comment: input.comment,
        tickets,
        rawPayload: input.rawPayload
      });

      await this.bookingRepo.updateReservationStatus(input.reservationReference, 'expired');
    });

    return {
      data: {
        bookingReference,
        tickets
      }
    };
  }

  async cancelBooking(input: { bookingReference: string }) {
    const existing = await this.bookingRepo.findBookingByReference(input.bookingReference);
    if (!existing) {
      return { errorCode: 'INVALID_BOOKING', errorMessage: 'Booking not found' };
    }

    if (existing.status === 'cancelled') {
      return { data: {} };
    }

    await this.bookingRepo.updateBookingStatus(input.bookingReference, 'cancelled');
    return { data: {} };
  }

  listBookings(filter: { status?: string; gygBookingReference?: string }) {
    return this.bookingRepo.listBookings(filter);
  }

  saveNotification(payload: unknown) {
    return this.bookingRepo.createNotification(payload);
  }
}
