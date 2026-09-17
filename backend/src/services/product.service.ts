import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import type { CreateProductInput, UpdateProductInput } from '../validators/product.validator.js';

export class ProductService {
  async getAllProducts() {
    const products = await prisma.product.findMany({
      orderBy: { productCode: 'asc' },
      include: {
        inventory: true,
      },
    });

    return products.map((p) => {
      const inv = p.inventory;
      const physical = inv?.physicalQuantity ?? 0;
      const reserved = inv?.reservedQuantity ?? 0;
      const damaged = inv?.damagedQuantity ?? 0;
      const available = Math.max(0, physical - reserved - damaged);

      return {
        ...p,
        inventory: inv
          ? {
              ...inv,
              availableQuantity: available,
            }
          : null,
      };
    });
  }

  async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        inventory: true,
      },
    });

    if (!product) {
      throw AppError.notFound(`Product with ID '${id}' not found`);
    }

    const inv = product.inventory;
    const physical = inv?.physicalQuantity ?? 0;
    const reserved = inv?.reservedQuantity ?? 0;
    const damaged = inv?.damagedQuantity ?? 0;
    const available = Math.max(0, physical - reserved - damaged);

    return {
      ...product,
      inventory: inv
        ? {
            ...inv,
            availableQuantity: available,
          }
        : null,
    };
  }

  async createProduct(data: CreateProductInput) {
    // 1. Check productCode uniqueness
    const existing = await prisma.product.findUnique({
      where: { productCode: data.productCode },
    });
    if (existing) {
      throw AppError.conflict(`Product code '${data.productCode}' already exists.`);
    }

    // 2. Create product with 1:1 inventory record in a transaction
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          productCode: data.productCode,
          productName: data.productName,
          category: data.category,
          unit: data.unit,
          basePrice: data.basePrice,
          inventory: {
            create: {
              physicalQuantity: data.initialPhysicalQuantity || 0,
              reservedQuantity: 0,
              damagedQuantity: 0,
            },
          },
        },
        include: {
          inventory: true,
        },
      });

      return {
        ...product,
        inventory: {
          ...product.inventory!,
          availableQuantity: product.inventory!.physicalQuantity,
        },
      };
    });
  }

  async updateProduct(id: string, data: UpdateProductInput) {
    await this.getProductById(id);

    if (data.productCode) {
      const duplicate = await prisma.product.findFirst({
        where: {
          productCode: data.productCode,
          NOT: { id },
        },
      });
      if (duplicate) {
        throw AppError.conflict(`Product code '${data.productCode}' already exists.`);
      }
    }

    return prisma.product.update({
      where: { id },
      data: {
        productCode: data.productCode,
        productName: data.productName,
        category: data.category,
        unit: data.unit,
        basePrice: data.basePrice,
      },
      include: {
        inventory: true,
      },
    });
  }
}

export const productService = new ProductService();
