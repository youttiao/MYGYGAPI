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
    return this.prisma.product.findUnique({ where: { id } });
  }

  listBySupplierId(supplierId: string) {
    return this.prisma.product.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'desc' }
    });
  }
}
