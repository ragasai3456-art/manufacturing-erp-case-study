import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import type { CreateEnquiryInput } from '../validators/enquiry.validator.js';
import type { EnquiryStatus } from '@prisma/client';

export class EnquiryService {
  async getAllEnquiries() {
    return prisma.enquiry.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        items: {
          include: { product: true },
        },
        _count: {
          select: { quotations: true },
        },
      },
    });
  }

  async getEnquiryById(id: string) {
    const enquiry = await prisma.enquiry.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        items: {
          include: { product: true },
        },
        quotations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!enquiry) {
      throw AppError.notFound(`Enquiry with ID '${id}' not found`);
    }

    return enquiry;
  }

  async createEnquiry(createdById: string, data: CreateEnquiryInput) {
    // 1. Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer) {
      throw AppError.notFound(`Customer with ID '${data.customerId}' does not exist.`);
    }

    // 2. Verify all products exist
    const productIds = data.items.map((i) => i.productId);
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });

    if (existingProducts.length !== productIds.length) {
      const foundSet = new Set(existingProducts.map((p) => p.id));
      const missingIds = productIds.filter((pid) => !foundSet.has(pid));
      throw AppError.badRequest(`Invalid product IDs: ${missingIds.join(', ')}`);
    }

    // 3. Generate unique enquiry number if not provided
    let enquiryNumber = data.enquiryNumber;
    if (!enquiryNumber) {
      const count = await prisma.enquiry.count();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      enquiryNumber = `ENQ-${new Date().getFullYear()}-${(count + 1)
        .toString()
        .padStart(4, '0')}-${randomSuffix}`;
    } else {
      const existing = await prisma.enquiry.findUnique({
        where: { enquiryNumber },
      });
      if (existing) {
        throw AppError.conflict(`Enquiry number '${enquiryNumber}' already exists.`);
      }
    }

    // 4. Create enquiry with normalized relational line items in a transaction
    return prisma.$transaction(async (tx) => {
      return tx.enquiry.create({
        data: {
          enquiryNumber: enquiryNumber!,
          customerId: data.customerId,
          createdById,
          requiredDate: new Date(data.requiredDate),
          notes: data.notes || null,
          status: 'NEW',
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          customer: true,
          items: {
            include: { product: true },
          },
        },
      });
    });
  }

  async updateEnquiryStatus(id: string, status: EnquiryStatus) {
    const existing = await this.getEnquiryById(id);

    return prisma.enquiry.update({
      where: { id },
      data: { status },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
      },
    });
  }
}

export const enquiryService = new EnquiryService();
