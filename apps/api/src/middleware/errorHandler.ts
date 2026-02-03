import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 * Never exposes stack traces in production
 */
export function errorHandler(
  err: Error | AppError | ZodError | PrismaClientKnownRequestError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error details server-side
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: isDevelopment
        ? err.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          }))
        : undefined,
    });
    return;
  }

  // Handle Prisma errors
  if (err instanceof PrismaClientKnownRequestError) {
    // Don't expose database errors to client
    res.status(400).json({
      error: 'Database Error',
      message: 'An error occurred while processing your request',
    });
    return;
  }

  // Handle custom AppError
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      error: err.statusCode >= 500 ? 'Internal Server Error' : 'Error',
      message: err.message,
    });
    return;
  }

  // Handle unexpected errors
  res.status(500).json({
    error: 'Internal Server Error',
    message: isDevelopment
      ? err.message
      : 'An unexpected error occurred. Please try again later.',
  });
}

/**
 * Async error wrapper
 * Catches async errors and passes them to error handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
}
