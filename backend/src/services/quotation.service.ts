import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import type { CreateQuotationInput } from '../validators/quotation.validator.js';
import type { QuotationStatus } from '@prisma/client';

export class QuotationService {
  // Authoritative financial calculations helper
  calculateLineItem(qty: number, unitPrice: number, discountPct: number, gstPct: number) {
    const baseAmount = qty * unitPrice;
    const discountAmount = (baseAmount * discountPct) / 100;
    const afterDiscount = baseAmount - discountAmount;
    const gstAmount = (afterDiscount * gstPct) / 100;
    const lineAmount = afterDiscount + gstAmount;

    // Financial rounding to 2 decimal places
    const round = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

    return {
      baseAmount: round(baseAmount),
      discountAmount: round(discountAmount),
      afterDiscount: round(afterDiscount),
      gstAmount: round(gstAmount),
      lineAmount: round(lineAmount),
    };
  }

  async getAllQuotations() {
    return prisma.quotation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        enquiry: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        items: {
          include: { product: true },
        },
        salesOrder: {
          select: { id: true, orderNumber: true, status: true },
        },
      },
    });
  }

  async getQuotationById(id: string) {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        enquiry: {
          include: {
            items: {
              include: { product: true },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        items: {
          include: { product: true },
        },
        salesOrder: true,
      },
    });

    if (!quotation) {
      throw AppError.notFound(`Quotation with ID '${id}' not found`);
    }

    return quotation;
  }

  async createQuotation(createdById: string, data: CreateQuotationInput) {
    // 1. Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer) {
      throw AppError.notFound(`Customer with ID '${data.customerId}' does not exist.`);
    }

    // 2. Verify enquiry exists and belongs to customer
    const enquiry = await prisma.enquiry.findUnique({
      where: { id: data.enquiryId },
    });
    if (!enquiry) {
      throw AppError.notFound(`Enquiry with ID '${data.enquiryId}' does not exist.`);
    }
    if (enquiry.customerId !== data.customerId) {
      throw AppError.badRequest(
        `Enquiry '${enquiry.enquiryNumber}' does not belong to customer '${customer.companyName}'.`
      );
    }

    // 3. Verify all products exist
    const productIds = data.items.map((i) => i.productId);
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, basePrice: true },
    });
    if (existingProducts.length !== productIds.length) {
      const foundSet = new Set(existingProducts.map((p) => p.id));
      const missingIds = productIds.filter((pid) => !foundSet.has(pid));
      throw AppError.badRequest(`Invalid product IDs: ${missingIds.join(', ')}`);
    }

    // 4. Generate unique quotation number if not provided
    let quotationNumber = data.quotationNumber;
    if (!quotationNumber) {
      const count = await prisma.quotation.count();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      quotationNumber = `QUO-${new Date().getFullYear()}-${(count + 1)
        .toString()
        .padStart(4, '0')}-${randomSuffix}`;
    } else {
      const existing = await prisma.quotation.findUnique({
        where: { quotationNumber },
      });
      if (existing) {
        throw AppError.conflict(`Quotation number '${quotationNumber}' already exists.`);
      }
    }

    // 5. Calculate authoritative financial line items and totals
    let calculatedSubtotal = 0;
    let calculatedDiscount = 0;
    let calculatedGst = 0;
    let calculatedGrandTotal = 0;

    const calculatedItems = data.items.map((item) => {
      const { baseAmount, discountAmount, gstAmount, lineAmount } = this.calculateLineItem(
        item.quantity,
        item.unitPrice,
        item.discountPct ?? 0,
        item.gstPct ?? 18
      );

      calculatedSubtotal += baseAmount;
      calculatedDiscount += discountAmount;
      calculatedGst += gstAmount;
      calculatedGrandTotal += lineAmount;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPct: item.discountPct ?? 0,
        gstPct: item.gstPct ?? 18,
        lineAmount,
      };
    });

    const round = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

    // 6. Create quotation and line items in a transaction
    return prisma.$transaction(async (tx) => {
      const newQuotation = await tx.quotation.create({
        data: {
          quotationNumber: quotationNumber!,
          enquiryId: data.enquiryId,
          customerId: data.customerId,
          createdById,
          validUntil: new Date(data.validUntil),
          status: 'DRAFT',
          subtotal: round(calculatedSubtotal),
          discountAmount: round(calculatedDiscount),
          gstAmount: round(calculatedGst),
          grandTotal: round(calculatedGrandTotal),
          items: {
            create: calculatedItems,
          },
        },
        include: {
          customer: true,
          enquiry: true,
          items: {
            include: { product: true },
          },
        },
      });

      // Update enquiry status to QUOTED if still NEW
      if (enquiry.status === 'NEW') {
        await tx.enquiry.update({
          where: { id: enquiry.id },
          data: { status: 'QUOTED' },
        });
      }

      return newQuotation;
    });
  }

  async updateQuotationStatus(id: string, newStatus: QuotationStatus) {
    const quotation = await this.getQuotationById(id);
    const currentStatus = quotation.status;

    if (currentStatus === newStatus) {
      return quotation;
    }

    // Strict transition rule validation
    const allowedTransitions: Record<QuotationStatus, QuotationStatus[]> = {
      DRAFT: ['SENT'],
      SENT: ['ACCEPTED', 'REJECTED'],
      ACCEPTED: [], // Terminal state for quotation modifications
      REJECTED: [], // Terminal state
    };

    const validNextStates = allowedTransitions[currentStatus] || [];
    if (!validNextStates.includes(newStatus)) {
      throw AppError.badRequest(
        `Invalid quotation status transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${validNextStates.join(
          ', '
        ) || 'None'}`
      );
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.quotation.update({
        where: { id },
        data: { status: newStatus },
        include: {
          customer: true,
          enquiry: true,
          items: {
            include: { product: true },
          },
        },
      });

      // Update associated enquiry status if WON or LOST
      if (newStatus === 'ACCEPTED') {
        await tx.enquiry.update({
          where: { id: quotation.enquiryId },
          data: { status: 'WON' },
        });
      } else if (newStatus === 'REJECTED') {
        await tx.enquiry.update({
          where: { id: quotation.enquiryId },
          data: { status: 'LOST' },
        });
      }

      return updated;
    });
  }

  // Convert ACCEPTED quotation into Sales Order
  async convertToSalesOrder(quotationId: string, createdById: string) {
    const quotation = await this.getQuotationById(quotationId);

    // CRITICAL: Only ACCEPTED quotations can be converted
    if (quotation.status !== 'ACCEPTED') {
      throw AppError.conflict(
        `Cannot convert quotation '${quotation.quotationNumber}' with status '${quotation.status}' to a Sales Order. Only ACCEPTED quotations may be converted.`
      );
    }

    // Check if a sales order already exists for this quotation
    if (quotation.salesOrder) {
      throw AppError.conflict(
        `Sales order already exists for quotation '${quotation.quotationNumber}' (Order Number: ${quotation.salesOrder.orderNumber}).`
      );
    }

    // Generate unique Sales Order Number
    const count = await prisma.salesOrder.count();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `SO-${new Date().getFullYear()}-${(count + 1)
      .toString()
      .padStart(4, '0')}-${randomSuffix}`;

    // Transactional conversion preserving full audit traceability
    return prisma.$transaction(async (tx) => {
      // Re-verify uniqueness inside transaction
      const existing = await tx.salesOrder.findUnique({
        where: { quotationId },
      });
      if (existing) {
        throw AppError.conflict(
          `Sales order already exists for quotation '${quotation.quotationNumber}'.`
        );
      }

      const salesOrder = await tx.salesOrder.create({
        data: {
          orderNumber,
          customerId: quotation.customerId,
          quotationId: quotation.id,
          orderDate: new Date(),
          totalAmount: quotation.grandTotal,
          status: 'PENDING',
          items: {
            create: quotation.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineAmount: item.lineAmount,
            })),
          },
        },
        include: {
          customer: true,
          quotation: true,
          items: {
            include: { product: true },
          },
        },
      });

      return salesOrder;
    });
  }
}

export const quotationService = new QuotationService();
