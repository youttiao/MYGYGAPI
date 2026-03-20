import { describe, expect, it, vi } from 'vitest';
import { AutoCloseService } from '../src/services/autoCloseService.js';

describe('AutoCloseService', () => {
  it('swallows runOnce failures during start and logs them', async () => {
    const logger = {
      error: vi.fn(),
      info: vi.fn()
    } as any;

    const prisma = {
      product: {
        findMany: vi.fn().mockRejectedValue(new Error('db down'))
      }
    } as any;

    const service = new AutoCloseService(prisma, logger, 60_000);

    service.start();
    await new Promise((resolve) => setTimeout(resolve, 0));
    service.stop();

    expect(logger.error).toHaveBeenCalled();
  });
});
