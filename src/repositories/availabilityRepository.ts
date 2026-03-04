import type { PrismaClient } from '@prisma/client';

export class AvailabilityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertBatch(
    productId: string,
    rows: Array<{
      dateTime: Date;
      openingTimes?: unknown;
      cutoffSeconds?: number;
      vacancies?: number;
      vacanciesByCategory?: unknown;
      currency?: string;
      pricesByCategory?: unknown;
      tieredPricesByCategory?: unknown;
    }>
  ) {
    return this.prisma.$transaction(
      rows.map((row) =>
        this.prisma.availability.upsert({
          where: {
            productId_dateTime: {
              productId,
              dateTime: row.dateTime
            }
          },
          update: {
            openingTimes: row.openingTimes as any,
            cutoffSeconds: row.cutoffSeconds,
            vacancies: row.vacancies,
            vacanciesByCategory: row.vacanciesByCategory as any,
            currency: row.currency,
            pricesByCategory: row.pricesByCategory as any,
            tieredPricesByCategory: row.tieredPricesByCategory as any
          },
          create: {
            productId,
            dateTime: row.dateTime,
            openingTimes: row.openingTimes as any,
            cutoffSeconds: row.cutoffSeconds,
            vacancies: row.vacancies,
            vacanciesByCategory: row.vacanciesByCategory as any,
            currency: row.currency,
            pricesByCategory: row.pricesByCategory as any,
            tieredPricesByCategory: row.tieredPricesByCategory as any
          }
        })
      )
    );
  }

  findByRange(externalProductId: string, fromDateTime: Date, toDateTime: Date) {
    return this.prisma.availability.findMany({
      where: {
        product: { productId: externalProductId },
        dateTime: {
          gte: fromDateTime,
          lte: toDateTime
        }
      },
      orderBy: { dateTime: 'asc' },
      include: {
        product: true
      }
    });
  }
}
