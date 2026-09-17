import { z } from 'zod';

export const dispatchOrderSchema = z.object({
  vehicleNumber: z
    .string()
    .trim()
    .min(3, 'Vehicle number must be at least 3 characters long')
    .max(50, 'Vehicle number cannot exceed 50 characters')
    .toUpperCase(),
  driverName: z
    .string()
    .trim()
    .min(2, 'Driver name must be at least 2 characters long')
    .max(100, 'Driver name cannot exceed 100 characters'),
  notes: z.string().max(500).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type DispatchOrderInput = z.infer<typeof dispatchOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
