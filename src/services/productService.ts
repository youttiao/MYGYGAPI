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
    pricingMode?: 'MANUAL_IN_GYG' | 'PRICE_OVER_API';
    status: 'active' | 'inactive';
    destinationCity: string;
    destinationCountry: string;
    participantsMin?: number;
    participantsMax?: number;
    autoCloseHours?: number;
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
        pricingMode: input.pricingMode ?? 'MANUAL_IN_GYG',
        status: input.status,
        destinationCity: input.destinationCity,
        destinationCountry: input.destinationCountry,
        participantsMin: input.participantsMin,
        participantsMax: input.participantsMax,
        autoCloseHours: input.autoCloseHours ?? 0
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

  updateProductSettings(
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
    return this.repo.updateSettings(id, settings);
  }

  replaceProductAddons(
    id: string,
    addons: Array<{
      addonType: string;
      retailPrice: number;
      currency: string;
      addonDescription?: string;
    }>
  ) {
    return this.repo.replaceAddons(id, addons);
  }
}
