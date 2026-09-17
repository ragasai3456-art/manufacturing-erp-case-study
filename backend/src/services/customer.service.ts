import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import type { CreateCustomerInput, UpdateCustomerInput } from '../validators/customer.validator.js';

export class CustomerService {
  async getAllCustomers() {
    return prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            enquiries: true,
            quotations: true,
            salesOrders: true,
          },
        },
      },
    });
  }

  async getCustomerById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        enquiries: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: { product: true },
            },
          },
        },
        quotations: {
          orderBy: { createdAt: 'desc' },
        },
        salesOrders: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw AppError.notFound(`Customer with ID '${id}' not found`);
    }

    return customer;
  }

  async createCustomer(data: CreateCustomerInput) {
    return prisma.customer.create({
      data: {
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        mobile: data.mobile,
        email: data.email,
        city: data.city,
      },
    });
  }

  async updateCustomer(id: string, data: UpdateCustomerInput) {
    // Check existence
    await this.getCustomerById(id);

    return prisma.customer.update({
      where: { id },
      data,
    });
  }
}

export const customerService = new CustomerService();
