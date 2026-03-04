import type { PrismaClient } from '@prisma/client';
import { ProductRepository } from '../repositories/productRepository.js';

export class ProductService {
  private readonly repo: ProductRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new ProductRepository(prisma);
  }

  createProduct(input: {
    supplierId: string;
    productId: string;
    name: string;
    description: string;
    timezone: string;
    currency: string;
    status: 'active' | 'inactive';
    destinationCity: string;
    destinationCountry: string;
    participantsMin?: number;
    participantsMax?: number;
    pricingCategories?: Array<{
      category: string;
      minTicketAmount?: number | null;
      maxTicketAmount?: number | null;
      groupSizeMin?: number | null;
      groupSizeMax?: number | null;
      ageFrom?: number | null;
      ageTo?: number | null;
      bookingCategory?: string | null;
      price?: unknown;
    }>;
    addons?: Array<{
      addonType: string;
      addonDescription?: string;
      retailPrice: number;
      currency: string;
    }>;
  }) {
    return this.repo.createWithRelations({
      product: {
        supplierId: input.supplierId,
        productId: input.productId,
        name: input.name,
        description: input.description,
        timezone: input.timezone,
        currency: input.currency,
        status: input.status,
        destinationCity: input.destinationCity,
        destinationCountry: input.destinationCountry,
        participantsMin: input.participantsMin,
        participantsMax: input.participantsMax
      },
      pricingCategories: input.pricingCategories,
      addons: input.addons
    });
  }

  getProductByExternalId(productId: string) {
    return this.repo.findByExternalProductId(productId);
  }

  getProductById(id: string) {
    return this.repo.findById(id);
  }

  listSupplierProducts(supplierId: string) {
    return this.repo.listBySupplierId(supplierId);
  }

  listProducts(filter?: { supplierId?: string }) {
    return this.repo.listProducts(filter);
  }
}
