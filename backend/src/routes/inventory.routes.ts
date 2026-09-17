import { Router } from 'express';
import { inventoryController } from '../controllers/inventory.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { validate } from '../validators/auth.validator.js';
import { updateInventorySchema } from '../validators/inventory.validator.js';

const router = Router();

router.use(authenticateJwt);

// Both ADMIN and SALES can view inventory availability
router.get('/', requireRole('ADMIN', 'SALES'), (req, res, next) => {
  inventoryController.getAll(req, res, next);
});

router.get('/:productId', requireRole('ADMIN', 'SALES'), (req, res, next) => {
  inventoryController.getByProductId(req, res, next);
});

// ONLY ADMIN can modify physical or damaged inventory! SALES gets 403 Forbidden!
router.patch(
  '/:productId',
  requireRole('ADMIN'),
  validate(updateInventorySchema),
  (req, res, next) => {
    inventoryController.update(req, res, next);
  }
);

export const inventoryRoutes = router;
