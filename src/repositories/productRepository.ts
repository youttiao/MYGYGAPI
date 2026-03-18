import type { PrismaClient } from '@prisma/client';

export class ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  createWithRelations(input: {
    product: any;
    pricingCategories?: any[];
    addons?: any[];
  }) {
    return this.prisma.product.create({
      data: {
        ...input.product,
        pricingCategories: input.pricingCategories
          ? {
              createMany: {
                data: input.pricingCategories,
                skipDuplicates: true
              }
            }
          : undefined,
        addons: input.addons
          ? {
              createMany: {
                data: input.addons,
                skipDuplicates: true
              }
            }
          : undefined
      },
      include: {
        pricingCategories: true,
        addons: true
      }
    });
  }

  findByExternalProductId(productId: string) {
    return this.prisma.product.findUnique({
      where: { productId },
      include: {
        pricingCategories: true,
        addons: true
      }
    });
  }

  findById(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        pricingCategories: true,
        addons: true
      }
    });
  }

  listBySupplierId(supplierId: string) {
    return this.prisma.product.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'desc' }
    });
  }

  listProducts(filter?: { supplierId?: string }) {
    return this.prisma.product.findMany({
      where: {
        supplierId: filter?.supplierId
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateSettings(
    id: string,
    settings: {
      autoCloseHours?: number;
      participantsMin?: number;
      participantsMax?: number;
      groupSizeMin?: number;
      groupSizeMax?: number;
      pricingMode?: 'MANUAL_IN_GYG' | 'PRICE_OVER_API';
    }
  ) {
    if (
      settings.groupSizeMin !== undefined ||
      settings.groupSizeMax !== undefined
    ) {
      await this.prisma.pricingCategory.upsert({
        where: {
          productId_category: {
            productId: id,
            category: 'GROUP'
          }
        },
        update: {
          groupSizeMin: settings.groupSizeMin,
          groupSizeMax: settings.groupSizeMax
        },
        create: {
          productId: id,
          category: 'GROUP',
          groupSizeMin: settings.groupSizeMin,
          groupSizeMax: settings.groupSizeMax
        }
      });
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        autoCloseHours: settings.autoCloseHours,
        participantsMin: settings.participantsMin,
        participantsMax: settings.participantsMax,
        pricingMode: settings.pricingMode
      },
      include: {
        pricingCategories: true,
        addons: true
      }
    });
  }

  async replaceAddons(
    id: string,
    addons: Array<{
      addonType: string;
      retailPrice: number;
      currency: string;
      addonDescription?: string;
    }>
  ) {
    await this.prisma.$transaction([
      this.prisma.productAddon.deleteMany({ where: { productId: id } }),
      ...(addons.length > 0
        ? [
            this.prisma.productAddon.createMany({
              data: addons.map((addon) => ({
                productId: id,
                addonType: addon.addonType,
                addonDescription: addon.addonDescription,
                retailPrice: addon.retailPrice,
                currency: addon.currency
              }))
            })
          ]
        : [])
    ]);

    return this.prisma.product.findUnique({
      where: { id },
      include: {
        pricingCategories: true,
        addons: true
      }
    });
  }
}
