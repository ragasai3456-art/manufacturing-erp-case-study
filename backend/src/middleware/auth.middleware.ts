import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { AuthenticatedUser, UserRole } from '../types/express.js';

interface JwtPayloadClaims {
  id: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export const authenticateJwt = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(AppError.unauthorized('Authentication token is required.'));
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return next(AppError.unauthorized("Authentication token must follow 'Bearer <token>' format."));
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayloadClaims;

    if (!decoded.id || !decoded.role || !decoded.email) {
      return next(AppError.unauthorized('Invalid authentication token payload.'));
    }

    // Attach verified claims directly to request.
    // Client-provided parameters are NEVER used to determine identity.
    const authenticatedUser: AuthenticatedUser = {
      id: decoded.id,
      email: decoded.email,
      name: (decoded as unknown as { name?: string }).name || '',
      role: decoded.role,
    };

    req.user = authenticatedUser;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(AppError.unauthorized('Authentication token has expired. Please log in again.'));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(AppError.unauthorized('Invalid authentication token signature.'));
    }
    return next(AppError.unauthorized('Authentication failed.'));
  }
};
