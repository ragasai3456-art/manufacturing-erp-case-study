import { z } from 'zod';

export const createCustomerSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, 'Company name must be at least 2 characters long')
    .max(150, 'Company name cannot exceed 150 characters'),
  contactPerson: z
    .string()
    .trim()
    .min(2, 'Contact person must be at least 2 characters long')
    .max(100, 'Contact person cannot exceed 100 characters'),
  mobile: z
    .string()
    .trim()
    .min(7, 'Mobile number must be at least 7 characters long')
    .max(20, 'Mobile number cannot exceed 20 characters'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  city: z
    .string()
    .trim()
    .min(2, 'City must be at least 2 characters long')
    .max(100, 'City cannot exceed 100 characters'),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
