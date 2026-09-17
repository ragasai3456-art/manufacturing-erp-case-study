import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import type { UpdateInventoryInput } from '../validators/inventory.validator.js';

export class InventoryService {
  async getAllInventory() {
    const inventories = await prisma.inventory.findMany({
      include: {
        product: true,
      },
      orderBy: {
        product: { productCode: 'asc' },
      },
    });

    return inventories.map((inv) => {
      const available = Math.max(
        0,
        inv.physicalQuantity - inv.reservedQuantity - inv.damagedQuantity
      );
      return {
        ...inv,
        availableQuantity: available,
      };
    });
  }

  async getInventoryByProductId(productId: string) {
    const inventory = await prisma.inventory.findUnique({
      where: { productId },
      include: {
        product: true,
      },
    });

    if (!inventory) {
      throw AppError.notFound(`Inventory record for product ID '${productId}' not found`);
    }

    const available = Math.max(
      0,
      inventory.physicalQuantity - inventory.reservedQuantity - inventory.damagedQuantity
    );

    return {
      ...inventory,
      availableQuantity: available,
    };
  }

  async updateInventory(productId: string, data: UpdateInventoryInput) {
    const current = await this.getInventoryByProductId(productId);

    let newPhysical = current.physicalQuantity;
    let newDamaged = current.damagedQuantity;

    if (data.physicalQuantity !== undefined) {
      newPhysical = data.physicalQuantity;
    } else if (data.addPhysicalQuantity !== undefined) {
      newPhysical += data.addPhysicalQuantity;
    }

    if (data.damagedQuantity !== undefined) {
      newDamaged = data.damagedQuantity;
    } else if (data.addDamagedQuantity !== undefined) {
      newDamaged += data.addDamagedQuantity;
    }

    // Invariant checks
    if (newPhysical < 0) {
      throw AppError.badRequest('Physical quantity cannot be negative.');
    }
    if (newDamaged < 0) {
      throw AppError.badRequest('Damaged quantity cannot be negative.');
    }
    if (newDamaged > newPhysical) {
      throw AppError.badRequest(
        `Damaged quantity (${newDamaged}) cannot exceed physical quantity (${newPhysical}).`
      );
    }
    if (current.reservedQuantity > newPhysical - newDamaged) {
      throw AppError.badRequest(
        `Cannot reduce stock below already reserved quantity (${current.reservedQuantity}). Required net usable: ${current.reservedQuantity}, resulting net usable: ${newPhysical - newDamaged}.`
      );
    }

    const updated = await prisma.inventory.update({
      where: { productId },
      data: {
        physicalQuantity: newPhysical,
        damagedQuantity: newDamaged,
      },
      include: {
        product: true,
      },
    });

    const available = Math.max(
      0,
      updated.physicalQuantity - updated.reservedQuantity - updated.damagedQuantity
    );

    return {
      ...updated,
      availableQuantity: available,
    };
  }
}

export const inventoryService = new InventoryService();
