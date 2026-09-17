import { Router } from 'express';
import { customerController } from '../controllers/customer.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { validate } from '../validators/auth.validator.js';
import { createCustomerSchema, updateCustomerSchema } from '../validators/customer.validator.js';

const router = Router();

// All customer routes require authentication
router.use(authenticateJwt);

// Both ADMIN and SALES can view customers
router.get('/', requireRole('ADMIN', 'SALES'), (req, res, next) => {
  customerController.getAll(req, res, next);
});

router.get('/:id', requireRole('ADMIN', 'SALES'), (req, res, next) => {
  customerController.getById(req, res, next);
});

// Both ADMIN and SALES can create customers
router.post(
  '/',
  requireRole('ADMIN', 'SALES'),
  validate(createCustomerSchema),
  (req, res, next) => {
    customerController.create(req, res, next);
  }
);

// Both ADMIN and SALES can update customers
router.patch(
  '/:id',
  requireRole('ADMIN', 'SALES'),
  validate(updateCustomerSchema),
  (req, res, next) => {
    customerController.update(req, res, next);
  }
);

export const customerRoutes = router;
