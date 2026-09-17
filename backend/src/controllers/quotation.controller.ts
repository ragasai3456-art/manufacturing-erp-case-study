import type { Request, Response, NextFunction } from 'express';
import { quotationService } from '../services/quotation.service.js';

export class QuotationController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const quotations = await quotationService.getAllQuotations();
      res.status(200).json({ success: true, data: quotations });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const quotation = await quotationService.getQuotationById(req.params.id);
      res.status(200).json({ success: true, data: quotation });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const createdById = req.user!.id;
      const quotation = await quotationService.createQuotation(createdById, req.body);
      res.status(201).json({ success: true, data: quotation });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const quotation = await quotationService.updateQuotationStatus(
        req.params.id,
        req.body.status
      );
      res.status(200).json({ success: true, data: quotation });
    } catch (err) {
      next(err);
    }
  }

  async convert(req: Request, res: Response, next: NextFunction) {
    try {
      const createdById = req.user!.id;
      const salesOrder = await quotationService.convertToSalesOrder(req.params.id, createdById);
      res.status(201).json({
        success: true,
        message: 'Quotation successfully converted to Sales Order.',
        data: salesOrder,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const quotationController = new QuotationController();
