import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  // 1. Handled operational AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // 2. Zod Validation Error
  if (err instanceof ZodError) {
    const issues = (err as unknown as { issues?: Array<{ path: Array<string | number>; message: string }> }).issues || [];
    const formattedErrors = issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request payload validation failed',
        details: formattedErrors,
      },
    });
    return;
  }

  // 3. Prisma Known Request Errors
  if (err && typeof err === 'object' && 'code' in err) {
    const prismaError = err as { code: string; meta?: { target?: string[] } };
    // P2002: Unique constraint failed
    if (prismaError.code === 'P2002') {
      const field = prismaError.meta?.target ? prismaError.meta.target.join(', ') : 'field';
      res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: `A record with this ${field} already exists.`,
        },
      });
      return;
    }
    // P2025: Record not found
    if (prismaError.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Requested record was not found in the database.',
        },
      });
      return;
    }
  }

  // 4. Unexpected server error (log internally, do not leak secrets or stack traces)
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected server error occurred. Please try again later.',
    },
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl} - Endpoint not found`,
    },
  });
};
