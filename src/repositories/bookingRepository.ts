import type { PrismaClient } from '@prisma/client';

export class BookingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  createReservation(params: {
    reservationReference: string;
    gygBookingReference: string;
    gygActivityReference?: string;
    productId: string;
    dateTime: Date;
    bookingItems: unknown;
    expiresAt?: Date;
    rawPayload: unknown;
  }) {
    return this.prisma.reservation.create({
      data: {
        reservationReference: params.reservationReference,
        gygBookingReference: params.gygBookingReference,
        gygActivityReference: params.gygActivityReference,
        productId: params.productId,
        dateTime: params.dateTime,
        bookingItems: params.bookingItems as any,
        expiresAt: params.expiresAt,
        rawPayload: params.rawPayload as any
      }
    });
  }

  findReservationByGygBookingReference(gygBookingReference: string) {
    return this.prisma.reservation.findUnique({ where: { gygBookingReference } });
  }

  findReservationByReference(reservationReference: string) {
    return this.prisma.reservation.findUnique({ where: { reservationReference } });
  }

  updateReservationStatus(reservationReference: string, status: string) {
    return this.prisma.reservation.update({
      where: { reservationReference },
      data: { status }
    });
  }

  createBooking(params: {
    bookingReference: string;
    gygBookingReference: string;
    gygActivityReference?: string;
    reservationId: string;
    productId: string;
    dateTime: Date;
    currency: string;
    bookingItems: unknown;
    addonItems?: unknown;
    language?: string;
    travelers: unknown;
    travelerHotel?: string;
    comment: string;
    tickets: unknown;
    status?: string;
    rawPayload: unknown;
  }) {
    return this.prisma.booking.create({
      data: {
        bookingReference: params.bookingReference,
        gygBookingReference: params.gygBookingReference,
        gygActivityReference: params.gygActivityReference,
        reservationId: params.reservationId,
        productId: params.productId,
        dateTime: params.dateTime,
        currency: params.currency,
        bookingItems: params.bookingItems as any,
        addonItems: params.addonItems as any,
        language: params.language,
        travelers: params.travelers as any,
        travelerHotel: params.travelerHotel,
        comment: params.comment,
        tickets: params.tickets as any,
        status: params.status,
        rawPayload: params.rawPayload as any
      }
    });
  }

  findBookingByGygBookingReference(gygBookingReference: string) {
    return this.prisma.booking.findUnique({
      where: { gygBookingReference },
      include: { reservation: true }
    });
  }

  findBookingByReference(bookingReference: string) {
    return this.prisma.booking.findUnique({
      where: { bookingReference },
      include: { reservation: true }
    });
  }

  updateBookingStatus(bookingReference: string, status: string) {
    return this.prisma.booking.update({
      where: { bookingReference },
      data: { status }
    });
  }

  listBookings(filter: { status?: string; gygBookingReference?: string }) {
    return this.prisma.booking.findMany({
      where: {
        status: filter.status,
        gygBookingReference: filter.gygBookingReference
      },
      include: {
        product: true,
        reservation: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  createIdempotencyRecord(params: {
    endpoint: string;
    idempotencyKey: string;
    responseStatus: number;
    responseBody: unknown;
  }) {
    return this.prisma.idempotencyRecord.create({
      data: {
        endpoint: params.endpoint,
        idempotencyKey: params.idempotencyKey,
        responseStatus: params.responseStatus,
        responseBody: params.responseBody as any
      }
    });
  }

  findIdempotencyRecord(endpoint: string, idempotencyKey: string) {
    return this.prisma.idempotencyRecord.findUnique({
      where: {
        endpoint_idempotencyKey: {
          endpoint,
          idempotencyKey
        }
      }
    });
  }

  createNotification(payload: unknown) {
    return this.prisma.notificationEvent.create({
      data: { payload: payload as any }
    });
  }
}
