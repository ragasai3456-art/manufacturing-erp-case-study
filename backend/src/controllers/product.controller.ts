import type { Request, Response, NextFunction } from 'express';
import { productService } from '../services/product.service.js';

export class ProductController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await productService.getAllProducts();
      res.status(200).json({ success: true, data: products });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.getProductById(req.params.id);
      res.status(200).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.createProduct(req.body);
      res.status(201).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.updateProduct(req.params.id, req.body);
      res.status(200).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }
}

export const productController = new ProductController();
