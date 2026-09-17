import { z } from 'zod';

export const enquiryItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .positive('Quantity must be greater than 0'),
});

export const createEnquirySchema = z.object({
  enquiryNumber: z.string().trim().min(3).max(50).optional(),
  customerId: z.string().min(1, 'Customer ID is required'),
  requiredDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Required date must be a valid date string',
  }),
  notes: z.string().max(500).optional(),
  items: z
    .array(enquiryItemSchema)
    .min(1, 'An enquiry must contain at least one product line item'),
});

export const updateEnquiryStatusSchema = z.object({
  status: z.enum(['NEW', 'QUOTED', 'WON', 'LOST'] as const),
});

export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;
export type UpdateEnquiryStatusInput = z.infer<typeof updateEnquiryStatusSchema>;
