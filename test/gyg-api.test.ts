import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const basic = (user: string, pass: string) =>
  `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;

describe('GYG OPS minimal system', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let productInternalId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    await prisma.booking.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.availability.deleteMany();
    await prisma.pricingCategory.deleteMany();
    await prisma.productAddon.deleteMany();
    await prisma.product.deleteMany();

    const product = await prisma.product.create({
      data: {
        supplierId: 'supplier123',
        productId: 'prod123',
        name: 'Test Product',
        description: 'Test product description',
        timezone: 'Europe/Berlin',
        currency: 'EUR',
        pricingMode: 'MANUAL_IN_GYG',
        status: 'active',
        destinationCity: 'Berlin',
        destinationCountry: 'DEU'
      }
    });
    productInternalId = product.id;

    await prisma.availability.create({
      data: {
        productId: productInternalId,
        dateTime: new Date('2030-01-01T10:00:00+01:00'),
        cutoffSeconds: 3600,
        vacancies: 10,
        currency: 'EUR',
        pricesByCategory: {
          retailPrices: [{ category: 'ADULT', price: 1500 }]
        }
      }
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('1) availability 查询返回符合 schema', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/1/get-availabilities/?productId=prod123&fromDateTime=2029-12-31T00:00:00%2B01:00&toDateTime=2030-01-02T00:00:00%2B01:00',
      headers: { authorization: basic('gyg_user', 'gyg_pass') }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.availabilities.length).toBe(1);
    expect(body.data.availabilities[0]).toHaveProperty('productId', 'prod123');
    expect(body.data.availabilities[0]).toHaveProperty('dateTime');
    expect(body.data.availabilities[0]).not.toHaveProperty('currency');
    expect(body.data.availabilities[0]).not.toHaveProperty('pricesByCategory');
  });

  it('1.1) PRICE_OVER_API 产品会返回价格字段', async () => {
    await prisma.product.update({
      where: { id: productInternalId },
      data: { pricingMode: 'PRICE_OVER_API' }
    });

    const res = await app.inject({
      method: 'GET',
      url: '/1/get-availabilities/?productId=prod123&fromDateTime=2029-12-31T00:00:00%2B01:00&toDateTime=2030-01-02T00:00:00%2B01:00',
      headers: { authorization: basic('gyg_user', 'gyg_pass') }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.availabilities[0]).toHaveProperty('currency', 'EUR');
    expect(body.data.availabilities[0]).toHaveProperty('pricesByCategory');
  });

  it('2) booking 创建成功并入库', async () => {
    const reserveRes = await app.inject({
      method: 'POST',
      url: '/1/reserve/',
      headers: {
        authorization: basic('gyg_user', 'gyg_pass'),
        'content-type': 'application/json'
      },
      payload: {
        data: {
          productId: 'prod123',
          dateTime: '2030-01-01T10:00:00+01:00',
          bookingItems: [{ category: 'ADULT', count: 2 }],
          gygBookingReference: 'GYG-BOOK-001'
        }
      }
    });
    expect(reserveRes.statusCode).toBe(200);
    const reservationReference = reserveRes.json().data.reservationReference;

    const bookRes = await app.inject({
      method: 'POST',
      url: '/1/book/',
      headers: {
        authorization: basic('gyg_user', 'gyg_pass'),
        'content-type': 'application/json'
      },
      payload: {
        data: {
          productId: 'prod123',
          reservationReference,
          gygBookingReference: 'GYG-BOOK-001',
          currency: 'EUR',
          dateTime: '2030-01-01T10:00:00+01:00',
          bookingItems: [{ category: 'ADULT', count: 2, retailPrice: 1500 }],
          travelers: [
            {
              firstName: 'John',
              lastName: 'Smith',
              email: 'john@example.com',
              phoneNumber: '+49123456'
            }
          ],
          comment: 'test'
        }
      }
    });

    expect(bookRes.statusCode).toBe(200);
    expect(bookRes.json().data.bookingReference).toBe('bkGYGBOOK001');

    const booking = await prisma.booking.findUnique({
      where: { gygBookingReference: 'GYG-BOOK-001' }
    });
    expect(booking).not.toBeNull();
    expect(booking?.status).toBe('confirmed');
  });

  it('3) booking 幂等：重复请求不会重复创建', async () => {
    const reserveRes = await app.inject({
      method: 'POST',
      url: '/1/reserve/',
      headers: {
        authorization: basic('gyg_user', 'gyg_pass'),
        'content-type': 'application/json'
      },
      payload: {
        data: {
          productId: 'prod123',
          dateTime: '2030-01-01T10:00:00+01:00',
          bookingItems: [{ category: 'ADULT', count: 1 }],
          gygBookingReference: 'GYG-IDEMP-001'
        }
      }
    });
    expect(reserveRes.statusCode).toBe(200);
    const reservationReference = reserveRes.json().data.reservationReference;

    const payload = {
      data: {
        productId: 'prod123',
        reservationReference,
        gygBookingReference: 'GYG-IDEMP-001',
        currency: 'EUR',
        dateTime: '2030-01-01T10:00:00+01:00',
        bookingItems: [{ category: 'ADULT', count: 1, retailPrice: 1500 }],
        travelers: [
          {
            firstName: 'A',
            lastName: 'B',
            email: 'ab@example.com',
            phoneNumber: '+49111'
          }
        ],
        comment: 'idem'
      }
    };

    const r1 = await app.inject({
      method: 'POST',
      url: '/1/book/',
      headers: {
        authorization: basic('gyg_user', 'gyg_pass'),
        'content-type': 'application/json'
      },
      payload
    });
    const r2 = await app.inject({
      method: 'POST',
      url: '/1/book/',
      headers: {
        authorization: basic('gyg_user', 'gyg_pass'),
        'content-type': 'application/json'
      },
      payload
    });

    expect(r1.statusCode).toBe(200);
    expect(r2.statusCode).toBe(200);
    expect(r1.json().data.bookingReference).toBe(r2.json().data.bookingReference);

    const count = await prisma.booking.count({ where: { gygBookingReference: 'GYG-IDEMP-001' } });
    expect(count).toBe(1);
  });

  it('4) cancel 成功并更新状态', async () => {
    await prisma.reservation.create({
      data: {
        reservationReference: 'res_CANCEL001',
        gygBookingReference: 'GYG-CANCEL-001',
        productId: productInternalId,
        dateTime: new Date('2030-01-01T10:00:00+01:00'),
        bookingItems: [{ category: 'ADULT', count: 1 }],
        rawPayload: {}
      }
    });

    await prisma.booking.create({
      data: {
        bookingReference: 'bk_CANCEL001',
        gygBookingReference: 'GYG-CANCEL-001',
        reservationId: (await prisma.reservation.findUniqueOrThrow({ where: { reservationReference: 'res_CANCEL001' } })).id,
        productId: productInternalId,
        dateTime: new Date('2030-01-01T10:00:00+01:00'),
        currency: 'EUR',
        bookingItems: [{ category: 'ADULT', count: 1, retailPrice: 1500 }],
        travelers: [
          {
            firstName: 'John',
            lastName: 'Smith',
            email: 'john@example.com',
            phoneNumber: '+49123456'
          }
        ],
        comment: 'cancel',
        tickets: [{ category: 'ADULT', ticketCode: 'ABC', ticketCodeType: 'QR_CODE' }],
        rawPayload: {}
      }
    });

    const res = await app.inject({
      method: 'POST',
      url: '/1/cancel-booking/',
      headers: {
        authorization: basic('gyg_user', 'gyg_pass'),
        'content-type': 'application/json'
      },
      payload: {
        data: {
          bookingReference: 'bk_CANCEL001',
          gygBookingReference: 'GYG-CANCEL-001',
          productId: 'prod123'
        }
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: {} });

    const booking = await prisma.booking.findUnique({ where: { bookingReference: 'bk_CANCEL001' } });
    expect(booking?.status).toBe('cancelled');
  });

  it('5) Basic Auth 错误返回正确错误码', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/1/get-availabilities/?productId=prod123&fromDateTime=2029-12-31T00:00:00%2B01:00&toDateTime=2030-01-02T00:00:00%2B01:00',
      headers: { authorization: basic('wrong', 'wrong') }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().errorCode).toBe('AUTHORIZATION_FAILURE');
  });

  it('admin availability rules 支持单日打开覆盖并按原因拆分返回', async () => {
    await prisma.productClosedDate.createMany({
      data: [
        {
          productId: productInternalId,
          date: new Date('2030-01-02T00:00:00.000Z'),
          reason: 'manual-close'
        },
        {
          productId: productInternalId,
          date: new Date('2030-01-03T00:00:00.000Z'),
          reason: 'manual-open'
        }
      ]
    });

    const getRes = await app.inject({
      method: 'GET',
      url: '/admin/products/' + productInternalId + '/availability-rules',
      headers: { 'x-admin-token': 'admin_dev_token' }
    });

    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().data).toMatchObject({
      advanceCloseDays: 0,
      advanceCloseHours: 0,
      closedDates: ['2030-01-02'],
      openedDates: ['2030-01-03']
    });

    const patchRes = await app.inject({
      method: 'PATCH',
      url: '/admin/products/' + productInternalId + '/availability-rules',
      headers: {
        'x-admin-token': 'admin_dev_token',
        'content-type': 'application/json'
      },
      payload: {
        advanceCloseDays: 2,
        advanceCloseHours: 5,
        openedDates: ['2030-01-05'],
        closedDates: ['2030-01-06']
      }
    });

    expect(patchRes.statusCode).toBe(200);

    const rows = await prisma.productClosedDate.findMany({
      where: { productId: productInternalId },
      orderBy: { date: 'asc' }
    });

    expect(rows.map((row) => ({
      date: row.date.toISOString().slice(0, 10),
      reason: row.reason
    }))).toEqual([
      { date: '2030-01-05', reason: 'manual-open' },
      { date: '2030-01-06', reason: 'manual-close' }
    ]);

    const updatedProduct = await prisma.product.findUniqueOrThrow({
      where: { id: productInternalId }
    });
    expect(updatedProduct.autoCloseHours).toBe(53);
  });
});
