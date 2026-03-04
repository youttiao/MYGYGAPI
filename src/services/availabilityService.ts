import type { PrismaClient } from '@prisma/client';
import { AvailabilityRepository } from '../repositories/availabilityRepository.js';

export class AvailabilityService {
  private readonly repo: AvailabilityRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new AvailabilityRepository(prisma);
  }

  async upsertProductAvailabilities(
    productInternalId: string,
    availabilities: Array<{
      dateTime: string;
      openingTimes?: unknown;
      cutoffSeconds?: number;
      vacancies?: number;
      vacanciesByCategory?: unknown;
      currency?: string;
      pricesByCategory?: unknown;
      tieredPricesByCategory?: unknown;
    }>
  ) {
    return this.repo.upsertBatch(
      productInternalId,
      availabilities.map((item) => ({
        dateTime: new Date(item.dateTime),
        openingTimes: item.openingTimes,
        cutoffSeconds: item.cutoffSeconds,
        vacancies: item.vacancies,
        vacanciesByCategory: item.vacanciesByCategory,
        currency: item.currency,
        pricesByCategory: item.pricesByCategory,
        tieredPricesByCategory: item.tieredPricesByCategory
      }))
    );
  }

  async getAvailabilities(productId: string, fromDateTime: string, toDateTime: string) {
    return this.repo.findByRange(productId, new Date(fromDateTime), new Date(toDateTime));
  }

  async getAvailabilitiesByInternalProduct(
    productId: string,
    fromDateTime: string,
    toDateTime: string
  ) {
    return this.repo.findByProductIdRange(productId, new Date(fromDateTime), new Date(toDateTime));
  }
}
