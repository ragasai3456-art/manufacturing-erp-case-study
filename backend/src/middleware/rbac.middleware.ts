import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { UserRole } from '../types/express.js';

/**
 * Role-Based Access Control (RBAC) middleware.
 * Usage:
 *   requireRole('ADMIN')
 *   requireRole('SALES')
 *   requireRole('ADMIN', 'SALES')
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. Verify user was authenticated by JWT middleware
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required before role verification.'));
    }

    // 2. Check role authorization
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Access denied. Requires one of [${allowedRoles.join(', ')}] role, but user has '${req.user.role}'.`
        )
      );
    }

    next();
  };
};
