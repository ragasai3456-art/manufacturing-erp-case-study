import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { validate, registerSchema, loginSchema } from '../validators/auth.validator.js';

const router = Router();

// Public Authentication Endpoints
router.post('/register', validate(registerSchema), (req, res, next) => {
  authController.register(req, res, next);
});

router.post('/login', validate(loginSchema), (req, res, next) => {
  authController.login(req, res, next);
});

// Protected Profile Endpoint
router.get('/me', authenticateJwt, (req, res, next) => {
  authController.getMe(req, res, next);
});

// RBAC Verification Endpoints (Used for testing authorization boundaries)
router.get('/test/admin-only', authenticateJwt, requireRole('ADMIN'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access granted: You are authorized with the ADMIN role.',
    user: req.user,
  });
});

router.get('/test/sales-only', authenticateJwt, requireRole('SALES'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access granted: You are authorized with the SALES role.',
    user: req.user,
  });
});

router.get('/test/staff', authenticateJwt, requireRole('ADMIN', 'SALES'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access granted: You are an authenticated staff member.',
    user: req.user,
  });
});

export const authRoutes = router;
