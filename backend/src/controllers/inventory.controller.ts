import type { Request, Response, NextFunction } from 'express';
import { inventoryService } from '../services/inventory.service.js';

export class InventoryController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const inventory = await inventoryService.getAllInventory();
      res.status(200).json({ success: true, data: inventory });
    } catch (err) {
      next(err);
    }
  }

  async getByProductId(req: Request, res: Response, next: NextFunction) {
    try {
      const inventory = await inventoryService.getInventoryByProductId(req.params.productId);
      res.status(200).json({ success: true, data: inventory });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await inventoryService.updateInventory(req.params.productId, req.body);
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
}

export const inventoryController = new InventoryController();
