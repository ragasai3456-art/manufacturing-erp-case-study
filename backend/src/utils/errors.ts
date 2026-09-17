export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BAD_REQUEST'
  | 'INTERNAL_SERVER_ERROR'
  | 'INSUFFICIENT_STOCK'
  | 'INVALID_QUOTATION_STATUS'
  | 'DUPLICATE_SALES_ORDER'
  | 'DUPLICATE_DISPATCH';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static validation(message: string, details?: unknown) {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }

  static unauthorized(message = 'Unauthorized access') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Access forbidden: Insufficient permissions') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Requested resource not found') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string) {
    return new AppError(409, 'CONFLICT', message);
  }

  static internal(message = 'Internal server error') {
    return new AppError(500, 'INTERNAL_SERVER_ERROR', message);
  }
}
