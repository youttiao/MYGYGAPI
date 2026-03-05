import type { FastifyBaseLogger } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { AvailabilityService } from './availabilityService.js';

export class AutoCloseService {
  private timer?: NodeJS.Timeout;
  private readonly availabilityService: AvailabilityService;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: FastifyBaseLogger,
    private readonly intervalMs = 60_000
  ) {
    this.availabilityService = new AvailabilityService(prisma);
  }

  start() {
    this.stop();
    this.timer = setInterval(() => {
      void this.runOnce();
    }, this.intervalMs);
    void this.runOnce();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async runOnce() {
    const products = await this.prisma.product.findMany({
      where: {
        autoCloseHours: {
          gt: 0
        },
        status: 'active'
      },
      select: {
        id: true,
        autoCloseHours: true
      }
    });

    let updated = 0;
    for (const product of products) {
      const result = await this.availabilityService.autoCloseByProductHours(
        product.id,
        product.autoCloseHours
      );
      updated += result.count;
    }

    if (updated > 0) {
      this.logger.info({ updated }, 'availability_auto_closed');
    }
  }
}
