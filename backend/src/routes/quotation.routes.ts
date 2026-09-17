import { Router } from 'express';
import { quotationController } from '../controllers/quotation.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { validate } from '../validators/auth.validator.js';
import {
  createQuotationSchema,
  updateQuotationStatusSchema,
} from '../validators/quotation.validator.js';

const router = Router();

router.use(authenticateJwt);

// Both ADMIN and SALES can view quotations
router.get('/', requireRole('ADMIN', 'SALES'), (req, res, next) => {
  quotationController.getAll(req, res, next);
});

router.get('/:id', requireRole('ADMIN', 'SALES'), (req, res, next) => {
  quotationController.getById(req, res, next);
});

// Both ADMIN and SALES can create quotations
router.post(
  '/',
  requireRole('ADMIN', 'SALES'),
  validate(createQuotationSchema),
  (req, res, next) => {
    quotationController.create(req, res, next);
  }
);

// Update quotation status
router.patch(
  '/:id/status',
  requireRole('ADMIN', 'SALES'),
  validate(updateQuotationStatusSchema),
  (req, res, next) => {
    quotationController.updateStatus(req, res, next);
  }
);

// Convert ACCEPTED quotation into Sales Order (SALES or ADMIN can trigger conversion)
router.post(
  '/:id/convert',
  requireRole('ADMIN', 'SALES'),
  (req, res, next) => {
    quotationController.convert(req, res, next);
  }
);

export const quotationRoutes = router;
