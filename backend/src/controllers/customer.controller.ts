import type { Request, Response, NextFunction } from 'express';
import { customerService } from '../services/customer.service.js';

export class CustomerController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const customers = await customerService.getAllCustomers();
      res.status(200).json({ success: true, data: customers });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await customerService.getCustomerById(req.params.id);
      res.status(200).json({ success: true, data: customer });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await customerService.createCustomer(req.body);
      res.status(201).json({ success: true, data: customer });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await customerService.updateCustomer(req.params.id, req.body);
      res.status(200).json({ success: true, data: customer });
    } catch (err) {
      next(err);
    }
  }
}

export const customerController = new CustomerController();
