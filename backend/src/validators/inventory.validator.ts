import { z } from 'zod';

export const updateInventorySchema = z
  .object({
    physicalQuantity: z.number().int().nonnegative('Physical quantity cannot be negative').optional(),
    damagedQuantity: z.number().int().nonnegative('Damaged quantity cannot be negative').optional(),
    addPhysicalQuantity: z.number().int().optional(),
    addDamagedQuantity: z.number().int().optional(),
  })
  .refine(
    (data) =>
      data.physicalQuantity !== undefined ||
      data.damagedQuantity !== undefined ||
      data.addPhysicalQuantity !== undefined ||
      data.addDamagedQuantity !== undefined,
    {
      message: 'At least one inventory adjustment parameter must be provided',
    }
  );

export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>;
