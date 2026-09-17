import { Router } from 'express';
import { salesOrderController } from '../controllers/salesOrder.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { validate } from '../validators/auth.validator.js';
import {
  dispatchOrderSchema,
  cancelOrderSchema,
} from '../validators/salesOrder.validator.js';

const router = Router();

router.use(authenticateJwt);

// Both ADMIN and SALES can view Sales Orders
router.get('/', requireRole('ADMIN', 'SALES'), (req, res, next) => {
  salesOrderController.getAll(req, res, next);
});

router.get('/:id', requireRole('ADMIN', 'SALES'), (req, res, next) => {
  salesOrderController.getById(req, res, next);
});

// ADMIN-ONLY: Confirm Sales Order & Reserve Inventory
router.post(
  '/:id/confirm',
  requireRole('ADMIN'),
  (req, res, next) => {
    salesOrderController.confirm(req, res, next);
  }
);

// ADMIN-ONLY: Cancel Sales Order & Release Reserved Inventory
router.post(
  '/:id/cancel',
  requireRole('ADMIN'),
  validate(cancelOrderSchema),
  (req, res, next) => {
    salesOrderController.cancel(req, res, next);
  }
);

// ADMIN-ONLY: Dispatch Confirmed Sales Order & Deduct Physical/Reserved Stock
router.post(
  '/:id/dispatch',
  requireRole('ADMIN'),
  validate(dispatchOrderSchema),
  (req, res, next) => {
    salesOrderController.dispatch(req, res, next);
  }
);

export const salesOrderRoutes = router;
