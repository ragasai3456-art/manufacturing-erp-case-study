import type { Request, Response, NextFunction } from 'express';
import { enquiryService } from '../services/enquiry.service.js';

export class EnquiryController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const enquiries = await enquiryService.getAllEnquiries();
      res.status(200).json({ success: true, data: enquiries });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const enquiry = await enquiryService.getEnquiryById(req.params.id);
      res.status(200).json({ success: true, data: enquiry });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      // Identity strictly from req.user
      const createdById = req.user!.id;
      const enquiry = await enquiryService.createEnquiry(createdById, req.body);
      res.status(201).json({ success: true, data: enquiry });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const enquiry = await enquiryService.updateEnquiryStatus(req.params.id, req.body.status);
      res.status(200).json({ success: true, data: enquiry });
    } catch (err) {
      next(err);
    }
  }
}

export const enquiryController = new EnquiryController();
