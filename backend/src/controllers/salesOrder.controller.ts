import type { Request, Response, NextFunction } from 'express';
import { salesOrderService } from '../services/salesOrder.service.js';

export class SalesOrderController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await salesOrderService.getAllSalesOrders();
      res.status(200).json({ success: true, data: orders });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await salesOrderService.getSalesOrderById(req.params.id);
      res.status(200).json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }

  // ADMIN-only: Confirm order and atomically reserve stock
  async confirm(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUserId = req.user!.id;
      const order = await salesOrderService.confirmOrderAndReserveInventory(
        req.params.id,
        adminUserId
      );
      res.status(200).json({
        success: true,
        message: 'Sales Order confirmed and inventory reserved successfully.',
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  // ADMIN-only: Cancel order and release reserved stock
  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUserId = req.user!.id;
      const order = await salesOrderService.cancelSalesOrder(
        req.params.id,
        adminUserId,
        req.body
      );
      res.status(200).json({
        success: true,
        message: 'Sales Order cancelled successfully.',
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  // ADMIN-only: Dispatch confirmed order and decrement physical/reserved stock
  async dispatch(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUserId = req.user!.id;
      const result = await salesOrderService.dispatchSalesOrder(
        req.params.id,
        adminUserId,
        req.body
      );
      res.status(200).json({
        success: true,
        message: 'Sales Order dispatched successfully and inventory deducted.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const salesOrderController = new SalesOrderController();
