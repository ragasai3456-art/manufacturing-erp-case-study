import { Router } from 'express';
import { enquiryController } from '../controllers/enquiry.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { validate } from '../validators/auth.validator.js';
import { createEnquirySchema, updateEnquiryStatusSchema } from '../validators/enquiry.validator.js';

const router = Router();

// All enquiry routes require authentication
router.use(authenticateJwt);

// Both ADMIN and SALES can view enquiries
router.get('/', requireRole('ADMIN', 'SALES'), (req, res, next) => {
  enquiryController.getAll(req, res, next);
});

router.get('/:id', requireRole('ADMIN', 'SALES'), (req, res, next) => {
  enquiryController.getById(req, res, next);
});

// SALES and ADMIN can create enquiries
router.post(
  '/',
  requireRole('ADMIN', 'SALES'),
  validate(createEnquirySchema),
  (req, res, next) => {
    enquiryController.create(req, res, next);
  }
);

// SALES and ADMIN can update enquiry status
router.patch(
  '/:id/status',
  requireRole('ADMIN', 'SALES'),
  validate(updateEnquiryStatusSchema),
  (req, res, next) => {
    enquiryController.updateStatus(req, res, next);
  }
);

export const enquiryRoutes = router;
