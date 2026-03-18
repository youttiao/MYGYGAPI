import type { PrismaClient } from '@prisma/client';
import { BookingRepository } from '../repositories/bookingRepository.js';
import { ProductRepository } from '../repositories/productRepository.js';
import { toGygDateTime } from '../lib/dateTime.js';

function compactAlphaNum(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, '');
}

function makeReservationReference(gygBookingReference: string): string {
  return `res${compactAlphaNum(gygBookingReference)}`.slice(0, 25);
}

function makeAmendedReservationReference(gygBookingReference: string): string {
  const refTail = compactAlphaNum(gygBookingReference).slice(-6);
  const seed = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `res${refTail}${seed}`.slice(0, 25);
}

function makeBookingReference(gygBookingReference: string): string {
  return `bk${compactAlphaNum(gygBookingReference)}`.slice(0, 25);
}

function makeAmendedBookingReference(gygBookingReference: string): string {
  const refTail = compactAlphaNum(gygBookingReference).slice(-6);
  const seed = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `bk${refTail}${seed}`.slice(0, 25);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableWriteTimeout(error: unknown): boolean {
  const code = (error as any)?.code;
  const message = (error as Error)?.message ?? '';
  return (
    code === 'P1008' ||
    message.includes('Socket timeout') ||
    message.includes('database is locked')
  );
}

function hasEnoughAvailability(
  availability: {
    vacancies?: number | null;
    vacanciesByCategory?: unknown;
  } | null,
  bookingItems: Array<{ category: string; count: number }>
): boolean {
  if (!availability) {
    return false;
  }

  const byCategory = availability.vacanciesByCategory;
  if (Array.isArray(byCategory) && byCategory.length > 0) {
    const map = new Map<string, number>();
    byCategory.forEach((row: any) => {
      if (row && typeof row.category === 'string' && typeof row.vacancies === 'number') {
        map.set(row.category, row.vacancies);
      }
    });
    return bookingItems.every((item) => (map.get(item.category) ?? 0) >= item.count);
  }

  if (typeof availability.vacancies === 'number') {
    const requested = bookingItems.reduce((sum, item) => sum + item.count, 0);
    return availability.vacancies >= requested;
  }

  return false;
}

function normalizeBookingItems(items: Array<{ category: string; count: number }>) {
  return items
    .map((item) => ({
      category: item.category,
      count: item.count,
      groupSize: (item as any).groupSize ?? null
    }))
    .sort((a, b) =>
      a.category === b.category
        ? a.count === b.count
          ? (a.groupSize ?? 0) - (b.groupSize ?? 0)
          : a.count - b.count
        : a.category.localeCompare(b.category)
    );
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
    bookingItems: Array<{ category: string; count: number; groupSize?: number }>;
    gygBookingReference: string;
    gygActivityReference?: string;
    rawPayload: unknown;
  }) {
    const product = await this.productRepo.findByExternalProductId(input.productId);
    if (!product) {
      return { errorCode: 'INVALID_PRODUCT', errorMessage: 'Invalid productId' };
    }

    const requestedParticipants = input.bookingItems.reduce((sum, item) => {
      if (item.category === 'GROUP') {
        const groupSize = typeof item.groupSize === 'number' ? item.groupSize : 1;
        return sum + item.count * groupSize;
      }
      return sum + item.count;
    }, 0);
    if (
      (typeof product.participantsMin === 'number' && requestedParticipants < product.participantsMin) ||
      (typeof product.participantsMax === 'number' && requestedParticipants > product.participantsMax)
    ) {
      return {
        errorCode: 'INVALID_PARTICIPANTS_CONFIGURATION',
        errorMessage: `Participants must be between ${product.participantsMin ?? 1} and ${product.participantsMax ?? 999}`,
        participantsConfiguration: {
          min: product.participantsMin ?? 1,
          max: product.participantsMax ?? 999
        }
      };
    }

    if (Array.isArray(product.pricingCategories) && product.pricingCategories.length > 0) {
      const invalidCategory = input.bookingItems.find((item) => {
        const cfg = product.pricingCategories.find((row: any) => row.category === item.category);
        return !cfg;
      });
      if (invalidCategory) {
        return {
          errorCode: 'INVALID_TICKET_CATEGORY',
          errorMessage: `Invalid ticket category: ${invalidCategory.category}`,
          ticketCategory: invalidCategory.category
        };
      }

      const categoryRuleViolations = input.bookingItems.find((item) => {
        const cfg = product.pricingCategories.find((row: any) => row.category === item.category);
        if (!cfg) return false;
        if (typeof cfg.minTicketAmount === 'number' && item.count < cfg.minTicketAmount) return true;
        if (typeof cfg.maxTicketAmount === 'number' && item.count > cfg.maxTicketAmount) return true;
        if (item.category === 'GROUP') {
          const groupSize = typeof item.groupSize === 'number' ? item.groupSize : null;
          if (
            typeof cfg.groupSizeMin === 'number' &&
            (groupSize === null || groupSize < cfg.groupSizeMin)
          ) {
            return true;
          }
          if (
            typeof cfg.groupSizeMax === 'number' &&
            (groupSize === null || groupSize > cfg.groupSizeMax)
          ) {
            return true;
          }
        }
        return false;
      });
      if (categoryRuleViolations) {
        return {
          errorCode: 'INVALID_PARTICIPANTS_CONFIGURATION',
          errorMessage: `Invalid participants count for category ${categoryRuleViolations.category}`,
          participantsConfiguration: {
            min: product.participantsMin ?? 1,
            max: product.participantsMax ?? 999
          }
        };
      }
    }

    const slot = await this.prisma.availability.findFirst({
      where: {
        productId: product.id,
        dateTime: new Date(input.dateTime)
      },
      select: {
        vacancies: true,
        vacanciesByCategory: true,
        pricesByCategory: true
      }
    });

    if (!hasEnoughAvailability(slot, input.bookingItems)) {
      return {
        errorCode: 'NO_AVAILABILITY',
        errorMessage: 'Requested timeslot is not available'
      };
    }

    const categoriesFromConfig =
      Array.isArray(product.pricingCategories) && product.pricingCategories.length > 0
        ? product.pricingCategories.map((row: any) => row.category)
        : [];
    const categoriesFromVacancies = Array.isArray(slot?.vacanciesByCategory)
      ? (slot?.vacanciesByCategory as any[])
          .map((row: any) => row?.category)
          .filter((v: unknown) => typeof v === 'string')
      : [];
    const validCategories = new Set([
      ...categoriesFromConfig,
      ...categoriesFromVacancies
    ]);
    if (validCategories.size > 0) {
      const invalidCategory = input.bookingItems.find((item) => !validCategories.has(item.category));
      if (invalidCategory) {
        return {
          errorCode: 'INVALID_TICKET_CATEGORY',
          errorMessage: `Invalid ticket category: ${invalidCategory.category}`,
          ticketCategory: invalidCategory.category
        };
      }
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const existing = await this.bookingRepo.findReservationByGygBookingReference(input.gygBookingReference);
    if (existing) {
      const sameProduct = existing.productId === product.id;
      const sameDateTime = existing.dateTime.getTime() === new Date(input.dateTime).getTime();
      const sameBookingItems =
        JSON.stringify(normalizeBookingItems(existing.bookingItems as any)) ===
        JSON.stringify(normalizeBookingItems(input.bookingItems));

      if (sameProduct && sameDateTime && sameBookingItems) {
        return {
          data: {
            reservationReference: existing.reservationReference,
            reservationExpiration: existing.expiresAt
              ? toGygDateTime(existing.expiresAt, product.timezone)
              : undefined
          }
        };
      }

      const amendedReference = makeAmendedReservationReference(input.gygBookingReference);
      await this.bookingRepo.updateReservationByGygBookingReference(input.gygBookingReference, {
        reservationReference: amendedReference,
        dateTime: new Date(input.dateTime),
        bookingItems: input.bookingItems,
        expiresAt,
        status: 'created',
        rawPayload: input.rawPayload
      });
      return {
        data: {
          reservationReference: amendedReference,
          reservationExpiration: toGygDateTime(expiresAt, product.timezone)
        }
      };
    }

    const reservationReference = makeReservationReference(input.gygBookingReference);

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
        reservationExpiration: toGygDateTime(expiresAt, product.timezone)
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
    const product = await this.productRepo.findByExternalProductId(input.productId);
    if (!product) {
      return { errorCode: 'INVALID_PRODUCT', errorMessage: 'Invalid productId' };
    }

    const reservation = await this.bookingRepo.findReservationByReference(input.reservationReference);
    if (!reservation) {
      return { errorCode: 'INVALID_RESERVATION', errorMessage: 'Reservation not found' };
    }

    const existing = await this.bookingRepo.findBookingByGygBookingReference(input.gygBookingReference);
    if (existing) {
      const incomingItems = JSON.stringify(normalizeBookingItems(input.bookingItems));
      const existingItems = JSON.stringify(
        normalizeBookingItems((existing.bookingItems as Array<{ category: string; count: number }>) ?? [])
      );
      const samePayload =
        existing.reservation?.reservationReference === input.reservationReference &&
        existing.dateTime.getTime() === new Date(input.dateTime).getTime() &&
        existingItems === incomingItems;
      if (samePayload) {
        return {
          data: {
            bookingReference: existing.bookingReference,
            tickets: existing.tickets
          }
        };
      }
    }

    if (reservation.status !== 'created') {
      return { errorCode: 'INVALID_RESERVATION', errorMessage: 'Reservation not active' };
    }

    const bookingReference = makeBookingReference(input.gygBookingReference);
    const deferredTicketMessage =
      'Thank you for your booking.\n\n' +
      'Your ticket details and official entry QR code will be sent to you one day before your visit via in-platform message, WhatsApp, or iMessage.\n\n' +
      'We wish you a pleasant day. If you have any travel-related questions, please feel free to contact us anytime.\n\n' +
      'whatsApp: +86 17310038913 songjiao0913@gmail.com';
    const buildTickets = (ref: string) =>
      input.bookingItems.flatMap((item) =>
        Array.from({ length: item.count }).map((_, index) => ({
          category: item.category,
          ticketCode: `${deferredTicketMessage} Ref: ${ref}-${item.category}-${index + 1}`,
          ticketCodeType: 'TEXT'
        }))
      );
    const tickets = buildTickets(bookingReference);

    const maxAttempts = 4;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const retryExisting = await this.bookingRepo.findBookingByGygBookingReference(input.gygBookingReference);
      if (retryExisting) {
        const incomingItems = JSON.stringify(normalizeBookingItems(input.bookingItems));
        const existingItems = JSON.stringify(
          normalizeBookingItems((retryExisting.bookingItems as Array<{ category: string; count: number }>) ?? [])
        );
        const samePayload =
          retryExisting.reservation?.reservationReference === input.reservationReference &&
          retryExisting.dateTime.getTime() === new Date(input.dateTime).getTime() &&
          existingItems === incomingItems;
        if (samePayload) {
          return {
            data: {
              bookingReference: retryExisting.bookingReference,
              tickets: retryExisting.tickets
            }
          };
        }

        const amendedBookingReference = makeAmendedBookingReference(input.gygBookingReference);
        const amendedTickets = buildTickets(amendedBookingReference);
        await this.bookingRepo.updateBookingByGygBookingReference(input.gygBookingReference, {
          bookingReference: amendedBookingReference,
          reservationId: reservation.id,
          dateTime: new Date(input.dateTime),
          currency: input.currency,
          bookingItems: input.bookingItems,
          addonItems: input.addonItems,
          language: input.language,
          travelers: input.travelers,
          travelerHotel: input.travelerHotel,
          comment: input.comment,
          tickets: amendedTickets,
          rawPayload: input.rawPayload
        });
        await this.bookingRepo.updateReservationStatus(input.reservationReference, 'expired');
        return {
          data: {
            bookingReference: amendedBookingReference,
            tickets: amendedTickets
          }
        };
      }

      try {
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
        break;
      } catch (error) {
        if (!isRetryableWriteTimeout(error) || attempt === maxAttempts) {
          throw error;
        }
        await sleep(attempt * 120);
      }
    }

    return {
      data: {
        bookingReference,
        tickets
      }
    };
  }

  async cancelBooking(input: {
    bookingReference: string;
    gygBookingReference: string;
    productId: string;
  }) {
    let existing = await this.bookingRepo.findBookingByReference(input.bookingReference);
    if (!existing) {
      const fallback = await this.bookingRepo.findBookingByGygBookingReference(input.gygBookingReference);
      const product = await this.productRepo.findByExternalProductId(input.productId);
      if (!fallback || !product || fallback.productId !== product.id) {
        return { errorCode: 'INVALID_BOOKING', errorMessage: 'Booking not found' };
      }
      existing = fallback;
    }

    if (existing.status === 'cancelled') {
      return { data: {} };
    }

    await this.bookingRepo.updateBookingStatus(existing.bookingReference, 'cancelled');
    return { data: {} };
  }

  listBookings(filter: { status?: string; gygBookingReference?: string }) {
    return this.bookingRepo.listBookings(filter);
  }

  saveNotification(payload: unknown) {
    return this.bookingRepo.createNotification(payload);
  }
}
