import { env } from '../config/env.js';

export class GygOutboundService {
  async notifyAvailabilityUpdate(payload: {
    productId: string;
    availabilities: Array<{
      dateTime: string;
      openingTimes?: unknown;
      vacancies?: number | null;
      vacanciesByCategory?: unknown;
      cutoffSeconds?: number | null;
      currency?: string | null;
      pricesByCategory?: unknown;
      tieredPricesByCategory?: unknown;
    }>;
  }) {
    if (!env.gygApiUser || !env.gygApiPass) {
      throw new Error('GYG outbound credentials are not configured');
    }

    const url = `${env.gygApiBaseUrl.replace(/\/$/, '')}/1/notify-availability-update`;
    const auth = Buffer.from(`${env.gygApiUser}:${env.gygApiPass}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Basic ${auth}`
      },
      body: JSON.stringify({
        data: {
          productId: payload.productId,
          availabilities: payload.availabilities
        }
      })
    });

    const text = await response.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // Keep raw text if response is not JSON.
    }

    return {
      status: response.status,
      body
    };
  }
}
