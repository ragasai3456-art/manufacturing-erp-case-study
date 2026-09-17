import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .max(100, 'Password cannot exceed 100 characters'),
  role: z.enum(['ADMIN', 'SALES'] as const).optional(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
};
