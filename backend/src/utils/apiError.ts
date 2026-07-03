/**
 * Standardized application error for centralized error handling.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;
  public readonly code?: string;

  constructor(statusCode: number, message: string, options?: { details?: unknown; code?: string; isOperational?: boolean }) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = options?.isOperational ?? true;
    this.details = options?.details;
    this.code = options?.code;
    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details?: unknown) {
    return new ApiError(400, message, { details, code: 'BAD_REQUEST' });
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message, { code: 'UNAUTHORIZED' });
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message, { code: 'FORBIDDEN' });
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, { code: 'NOT_FOUND' });
  }

  static conflict(message = 'Conflict', details?: unknown) {
    return new ApiError(409, message, { details, code: 'CONFLICT' });
  }

  static unprocessable(message = 'Unprocessable entity', details?: unknown) {
    return new ApiError(422, message, { details, code: 'UNPROCESSABLE_ENTITY' });
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, { code: 'INTERNAL_ERROR', isOperational: false });
  }
}
