import { z } from 'zod';

export const createProductSchema = z.object({
  productCode: z
    .string()
    .trim()
    .min(2, 'Product code must be at least 2 characters long')
    .max(50, 'Product code cannot exceed 50 characters')
    .toUpperCase(),
  productName: z
    .string()
    .trim()
    .min(2, 'Product name must be at least 2 characters long')
    .max(150, 'Product name cannot exceed 150 characters'),
  category: z
    .string()
    .trim()
    .min(2, 'Category must be at least 2 characters long')
    .max(100, 'Category cannot exceed 100 characters'),
  unit: z
    .string()
    .trim()
    .min(1, 'Unit is required (e.g., PCS, SET, MTR)')
    .max(20, 'Unit cannot exceed 20 characters')
    .toUpperCase(),
  basePrice: z
    .number()
    .nonnegative('Base price cannot be negative'),
  initialPhysicalQuantity: z.number().int().nonnegative().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
