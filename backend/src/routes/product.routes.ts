import { Router } from 'express';
import { productController } from '../controllers/product.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { validate } from '../validators/auth.validator.js';
import { createProductSchema, updateProductSchema } from '../validators/product.validator.js';

const router = Router();

router.use(authenticateJwt);

// Both ADMIN and SALES can view products
router.get('/', requireRole('ADMIN', 'SALES'), (req, res, next) => {
  productController.getAll(req, res, next);
});

router.get('/:id', requireRole('ADMIN', 'SALES'), (req, res, next) => {
  productController.getById(req, res, next);
});

// ADMIN only can create/manage products
router.post(
  '/',
  requireRole('ADMIN'),
  validate(createProductSchema),
  (req, res, next) => {
    productController.create(req, res, next);
  }
);

router.patch(
  '/:id',
  requireRole('ADMIN'),
  validate(updateProductSchema),
  (req, res, next) => {
    productController.update(req, res, next);
  }
);

export const productRoutes = router;
