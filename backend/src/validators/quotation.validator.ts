import { z } from 'zod';

export const quotationItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .positive('Quantity must be greater than 0'),
  unitPrice: z
    .number()
    .nonnegative('Unit price cannot be negative'),
  discountPct: z
    .number()
    .min(0, 'Discount percentage cannot be negative')
    .max(100, 'Discount percentage cannot exceed 100')
    .default(0),
  gstPct: z
    .number()
    .min(0, 'GST percentage cannot be negative')
    .max(100, 'GST percentage cannot exceed 100')
    .default(18),
});

export const createQuotationSchema = z.object({
  quotationNumber: z.string().trim().min(3).max(50).optional(),
  enquiryId: z.string().min(1, 'Enquiry ID is required'),
  customerId: z.string().min(1, 'Customer ID is required'),
  validUntil: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Valid until must be a valid date string',
  }),
  items: z
    .array(quotationItemSchema)
    .min(1, 'A quotation must contain at least one product line item'),
});

export const updateQuotationStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'] as const),
});

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
export type UpdateQuotationStatusInput = z.infer<typeof updateQuotationStatusSchema>;
