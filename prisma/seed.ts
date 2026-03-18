import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.upsert({
    where: { productId: 'prod123' },
    create: {
      supplierId: 'supplier123',
      productId: 'prod123',
      name: 'Berlin Walking Tour',
      description: 'Small-group city walking tour',
      timezone: 'Europe/Berlin',
      currency: 'EUR',
      pricingMode: 'MANUAL_IN_GYG',
      status: 'active',
      destinationCity: 'Berlin',
      destinationCountry: 'DEU',
      participantsMin: 1,
      participantsMax: 20
    },
    update: {
      supplierId: 'supplier123',
      name: 'Berlin Walking Tour',
      description: 'Small-group city walking tour',
      timezone: 'Europe/Berlin',
      currency: 'EUR',
      pricingMode: 'MANUAL_IN_GYG',
      status: 'active',
      destinationCity: 'Berlin',
      destinationCountry: 'DEU',
      participantsMin: 1,
      participantsMax: 20
    }
  });

  await prisma.pricingCategory.deleteMany({ where: { productId: product.id } });
  await prisma.productAddon.deleteMany({ where: { productId: product.id } });

  await prisma.pricingCategory.createMany({
    data: [
      {
        productId: product.id,
        category: 'ADULT',
        minTicketAmount: 1,
        maxTicketAmount: 10,
        bookingCategory: 'STANDARD',
        price: [{ priceType: 'RETAIL_PRICE', price: 1500, currency: 'EUR' }] as any
      },
      {
        productId: product.id,
        category: 'CHILD',
        minTicketAmount: 0,
        maxTicketAmount: 10,
        bookingCategory: 'STANDARD',
        price: [{ priceType: 'RETAIL_PRICE', price: 1000, currency: 'EUR' }] as any
      }
    ]
  });

  await prisma.productAddon.createMany({
    data: [
      {
        productId: product.id,
        addonType: 'FOOD',
        addonDescription: 'Dinner at local restaurant',
        retailPrice: 1050,
        currency: 'EUR'
      }
    ]
  });

  const today = new Date();
  const base = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 8, 0, 0));
  const availabilities = Array.from({ length: 30 }).map((_, index) => {
    const dt = new Date(base);
    dt.setUTCDate(base.getUTCDate() + index);
    return {
      productId: product.id,
      dateTime: dt,
      cutoffSeconds: 3600,
      vacancies: 20,
      currency: 'EUR',
      pricesByCategory: {
        retailPrices: [
          { category: 'ADULT', price: 1500 },
          { category: 'CHILD', price: 1000 }
        ]
      }
    };
  });

  for (const row of availabilities) {
    await prisma.availability.upsert({
      where: {
        productId_dateTime: {
          productId: row.productId,
          dateTime: row.dateTime
        }
      },
      create: row,
      update: {
        cutoffSeconds: row.cutoffSeconds,
        vacancies: row.vacancies,
        currency: row.currency,
        pricesByCategory: row.pricesByCategory
      }
    });
  }

  console.log('Seed complete. Product:', product.productId);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
